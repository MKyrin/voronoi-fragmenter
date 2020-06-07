import Voronoi from 'voronoi'
import { buildCellsSvgs } from './buildSvg.js';
import sharp from 'sharp'
import rimraf from 'rimraf'
import fs from 'fs'
import { getRandomIntBetweem, getRandgomBetween } from './random.js';

const FIXED_SIZE = 800;

const Main = async () => {
    const voronoi = new Voronoi();
    const bbox = { xl: 0, xr: FIXED_SIZE, yt: 0, yb: FIXED_SIZE };
    const files = fs.readdirSync('./data/in')
    let fid = 0
    let pairCount = 0
   
    rimraf.sync("./data/out");

    fs.mkdirSync(`./data/out/`);
    fs.mkdirSync(`./data/out/pair`);
    fs.mkdirSync(`./data/out/all`);


    await asyncForEach(files, async file => {
        if (file.includes('.png') || file.includes('.jpg')) {
            console.log('Fracturing: ', file)
            const sites = getRandomSites()
            const diagram = voronoi.compute(sites, bbox)
            const cellSvgs = buildCellsSvgs(diagram, FIXED_SIZE, FIXED_SIZE)
            const adjacents = getAdjacentSites(diagram.cells)

            await asyncForEach(diagram.cells, async cell => {
                const siteId = cell.site.voronoiId
                const svg = cellSvgs[siteId]
                const shape = Buffer.from(svg)
                try {
                    await sharp(`./data/in/${file}`)
                        .resize({ width: FIXED_SIZE, height: FIXED_SIZE, options: { fit: 'contain' } })
                        .composite([{
                            input: shape,
                            blend: 'dest-in'
                        }])
                        .jpeg()
                        .toFile(`./data/out/all/${fid}_${siteId}.jpg`)
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