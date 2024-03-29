import Voronoi from 'voronoi'
import { buildCellsSvgs } from './buildSvg.js';
import sharp from 'sharp'
import rimraf from 'rimraf'
import fs from 'fs'
import { getRandomIntBetweem, getRandgomBetween } from './random.js';

const FIXED_SIZE = 800;
const fileRgx = new RegExp('(.+\.png)|(.+\.jpg)', 'ig')

const Main = async () => {
    const voronoi = new Voronoi();
    const bbox = { xl: 0, xr: FIXED_SIZE, yt: 0, yb: FIXED_SIZE };
    const files = fs.readdirSync('./data/in')
    let fid = 0
    let pairCount = 0

    const fileNames = []

    rimraf.sync("./data/out");

    fs.mkdirSync(`./data/out/`)
    fs.mkdirSync(`./data/out/pair`)
    fs.mkdirSync(`./data/out/not_pair`)
    fs.mkdirSync(`./data/out/all`)


    await asyncForEach(files, async file => {
        if (file.match(fileRgx)) {
            console.log('Fracturing: ', file)
            const sites = getRandomSites()
            const diagram = voronoi.compute(sites, bbox)
            const cellSvgs = buildCellsSvgs(diagram, FIXED_SIZE, FIXED_SIZE)
            const adjacents = getAdjacentSites(diagram.cells)

            await asyncForEach(diagram.cells, async cell => {
                const siteId = cell.site.voronoiId
                const svg = cellSvgs[siteId]
                const shape = Buffer.from(svg)

                let minX = FIXED_SIZE
                let minY = FIXED_SIZE
                let maxX = 0
                let maxY = 0

                cell.halfedges.forEach(({ edge: { va: { x: x1, y: y1, }, vb: { x: x2, y: y2 } } }) => {
                    if (minX > x1) minX = x1
                    if (minX > x2) minX = x2
                    if (maxX < x1) maxX = x1
                    if (maxX < x2) maxX = x2

                    if (minY > y1) minY = y1
                    if (minY > y2) minY = y2
                    if (maxY < y1) maxY = y1
                    if (maxY < y2) maxY = y2
                })

                minX = Math.max(0, Math.floor(minX))
                minY = Math.max(0, Math.floor(minY))
                maxX = Math.min(FIXED_SIZE, Math.ceil(maxX))
                maxY = Math.min(FIXED_SIZE, Math.ceil(maxY))

                const imgWidth = maxX - minX
                const imgHeight = maxY - minY

                try {
                    const clipped = await sharp(`./data/in/${file}`)
                        .resize({ width: FIXED_SIZE, height: FIXED_SIZE, options: { fit: 'contain' } })
                        .composite([{
                            input: shape,
                            blend: 'dest-in'
                        }])
                        .toBuffer();

                    const translated = await sharp(clipped)
                        .extract({
                            left: minX,
                            top: minY,
                            width: imgWidth,
                            height: imgHeight,
                        })
                        .extend({
                            left: Math.floor((FIXED_SIZE - imgWidth) / 2),
                            right: Math.floor((FIXED_SIZE - imgWidth) / 2) + (FIXED_SIZE - (imgWidth + 2 * (Math.floor((FIXED_SIZE - imgWidth) / 2)))),
                            top: Math.floor((FIXED_SIZE - imgHeight) / 2),
                            bottom: Math.floor((FIXED_SIZE - imgHeight) / 2) + (FIXED_SIZE - (imgHeight + 2 * (Math.floor((FIXED_SIZE - imgHeight) / 2)))),

                        })
                        .toBuffer();

                    await sharp(translated)
                        .rotate(90 * getRandomIntBetweem(0, 3))
                        .jpeg()
                        .toFile(`./data/out/all/${fid}_${siteId}.jpg`)

                    fileNames.push(`${fid}_${siteId}.jpg`)
                } catch (writeErr) {
                    console.log("Error writing file: ", writeErr)
                }
            })

            adjacents.forEach(async pair => {
                const s1 = pair[0]
                const s2 = pair[1]
                try {
                    fs.mkdirSync(`./data/out/pair/${pairCount}`)

                    fs.copyFileSync(`./data/out/all/${fid}_${s1}.jpg`, `./data/out/pair/${pairCount}/${fid}_${s1}.jpg`)
                    fs.copyFileSync(`./data/out/all/${fid}_${s2}.jpg`, `./data/out/pair/${pairCount}/${fid}_${s2}.jpg`)
                    pairCount++;
                } catch (writeErr) {
                    console.log("Error writing file: ", writeErr)
                }
            })

            voronoi.recycle(diagram)
            fid++
        }
    })

    const usedFileNames = {};

    for (let i = 0; i < pairCount; i++) {
        let written = false;
        console.log("Picking not pair: ", i)
        while (!written) {
            const fn1 = fileNames[getRandomIntBetweem(0, fileNames.length - 1)]
            const fn2 = fileNames[getRandomIntBetweem(0, fileNames.length - 1)]

            if(fn1.split('_')[0] === fn2.split('_')[0])
                continue;

            if (!usedFileNames[fn1] || !usedFileNames[fn1].includes(fn2)) {

                fs.mkdirSync(`./data/out/not_pair/${i}`)

                fs.copyFileSync(`./data/out/all/${fn1}`, `./data/out/not_pair/${i}/${fn1}`)
                fs.copyFileSync(`./data/out/all/${fn2}`, `./data/out/not_pair/${i}/${fn2}`)
                
                if(!usedFileNames[fn1]) usedFileNames[fn1] = []
                
                if(!usedFileNames[fn2]) usedFileNames[fn2] = []

                usedFileNames[fn1].push(fn2)
                usedFileNames[fn2].push(fn1)
                
                written = true;
            }
        }
    }
}


const getRandomSites = () => {
    const sites = []
    const nSites = getRandomIntBetweem(2, 6)
    for (let i = 0; i < nSites; i++) {
        sites.push({ x: getRandgomBetween(0, FIXED_SIZE), y: getRandgomBetween(0, FIXED_SIZE) })
    }
    return sites;
}

const getAdjacentSites = cells => {
    let adjacentSites = [];
    let testedSites = [];
    cells.forEach(cell1 => {
        cells.forEach(cell2 => {
            if (cell1 !== cell2) {
                let pairId = makeCellPairId(cell1, cell2);
                if (!containsPairId(testedSites, pairId) && !containsPairId(adjacentSites, pairId)) {
                    if (isAdjacentCell(cell1, cell2)) {
                        adjacentSites.push(pairId);
                    }
                    testedSites.push(pairId);
                }
            }
        });
    });
    return adjacentSites;
}

const makeCellPairId = (cell1, cell2) =>
    [Math.min(cell1.site.voronoiId, cell2.site.voronoiId), Math.max(cell1.site.voronoiId, cell2.site.voronoiId)]

const containsPairId = (array, pair) =>
    array.some(elm => elm[0] === pair[0] && elm[1] === pair[1]);

const isAdjacentCell = (cell1, cell2) =>
    cell1.halfedges.some(edge1 =>
        cell2.halfedges.some(edge2 => edge1.edge === edge2.edge));

const asyncForEach = async (array, callback) => {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
    }
}

export default Main