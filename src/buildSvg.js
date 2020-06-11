import { getRandgomBetween } from './random.js'

const MAX_NOISE = 10

export const buildCellsSvgs = (diagram, width, height) => {
    const endgeControlPoints = new Map();
    const cellSvgs = {};

    const buildCellSvg = (cell) => {
        // let circles = ''
        let fromPoint = getStartingPoint(cell)
        let path = startPoint(fromPoint.x, fromPoint.y);
        cell.halfedges.forEach(({ edge }) => {
            const toPoint = getNextPoint(edge, fromPoint);
            // console.log("EDGE: ", edge)
            if (isEdgeOnFrame(edge, width, height)) {
                path += lineTo(toPoint.x, toPoint.y)
            }
            else {
                if (!endgeControlPoints.has(edge)) {
                    endgeControlPoints.set(edge, getRandomControlPoint(edge))
                };

                // circles += `<circle cx="${endgeControlPoints.get(edge)[0]}" cy="${endgeControlPoints.get(edge)[1]}" r="5" stroke="blue" stroke-width="1" fill="blue" />`
                path += curveTo(toPoint.x, toPoint.y, endgeControlPoints.get(edge)[0], endgeControlPoints.get(edge)[1])
            }
            fromPoint = toPoint;
        });

        return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
                    <path d="${path}" fill="black" stroke="transparent" />
                </svg>`
    }

    diagram.cells.forEach(cell => {
        cellSvgs[cell.site.voronoiId] = buildCellSvg(cell, width, height)
        // console.log(`Cell SVG ${cell.site.voronoiId}`, cellSvgs[cell.site.voronoiId])
    });
    return cellSvgs
}

const startPoint = (x, y) => `M ${x} ${y}`

const lineTo = (x, y) => ` L ${x} ${y}`

const curveTo = (x, y, cx, cy) => ` Q ${cx} ${cy} ${x} ${y}`

const getNextPoint = ({ va, vb }, previousPoint) =>
    isSamePoint(va, previousPoint) ? vb : va;

const getStartingPoint = (cell) => {
    const { va: va1, vb: vb1 } = cell.halfedges[0].edge
    const { va: va2, vb: vb2 } = cell.halfedges[cell.halfedges.length - 1].edge
    if (isSamePoint(va1, va2) || isSamePoint(va1, vb2)) {
        return va1
    }
    return vb1
}

const isSamePoint = (p1, p2) => p1.x === p2.x && p1.y === p2.y;

const isEdgeOnFrame = ({ va: { x: x1, y: y1, }, vb: { x: x2, y: y2 } }, width, height) =>
    (x1 === 0 && x1 === x2) ||
    (x1 === width && x1 === x2) ||
    (y1 === 0 && y1 === y2) ||
    (y1 === height && y1 === y2)

const getRandomControlPoint = ({ va: { x: x1, y: y1, }, vb: { x: x2, y: y2 } }) => {
    const m = (y1 - y2) / (x1 - x2)
    const b = y1 - (m * x1)

    const dist = distanceBetweenPoints(x1, y1, x2, y2)

    const rx1 = getRandgomBetween(Math.min(x1, x2) + dist / 5, Math.max(x1, x2) - dist / 5)
    const ry1 = (m * rx1) + b;

    const f = (minDistanceToClosestVertice(x1, y1, x2, y2, rx1, ry1) / getRandgomBetween(5,10));

    const cx1 = (-(Math.sqrt((Math.pow(f, 2) * Math.pow(m, 2)) + Math.pow(f, 2)) / m) + (rx1 / Math.pow(m, 2)) + rx1) / ((1 / Math.pow(m, 2)) + 1)
    const cy1 = (-cx1 + rx1) / m + ry1


    return [cx1, cy1]
}

const minDistanceToClosestVertice = (x1, y1, x2, y2, cx, cy) =>
    Math.min(distanceBetweenPoints(x1, y1, cx, cy), distanceBetweenPoints(x2, y2, cx, cy))

const distanceBetweenPoints = (x1, y1, x2, y2) =>
    Math.sqrt(Math.pow(Math.abs(x1 - x2), 2) + Math.pow(Math.abs(y1 - y2), 2))