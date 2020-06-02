import Voronoi from 'voronoi'

const Main = () => {
    const voronoi = new Voronoi();
    const bbox = { xl: 0, xr: 800, yt: 0, yb: 800 };
    const sites = [{ x: 200, y: 200 }, { x: 120, y: 15 },  { x: 75, y: 300 }, { x: 400, y: 100 }];
    var diagram = voronoi.compute(sites, bbox);

    console.log("Adjacents: ", getAdjacentSites(diagram.cells));
}

const getAdjacentSites = cells => {
    let adjacentSites = [];
    let testedSites = [];    
    cells.forEach(cell1 => {
        cells.forEach(cell2 => {
            if(cell1 !== cell2) {
                let pairId = makeCellPairId(cell1, cell2);
                if(!containsPairId(testedSites, pairId) && !containsPairId(adjacentSites, pairId)) {
                    if(isAdjacentCell(cell1, cell2)){
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

export default Main