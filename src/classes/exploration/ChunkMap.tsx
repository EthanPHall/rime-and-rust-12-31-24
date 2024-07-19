import Vector2 from "../utility/Vector2";
import IMap from "./IMap";
import IMapLocationFactory from "./IMapLocationFactory";
import MapChunk from "./MapChunk";
import MapLocationData from "./MapLocationData";
import IMapLocationVisual from "./IMapLocationVisual";

class ChunkMap implements IMap{
    private factory: IMapLocationFactory;
    private dimensions: Vector2;
    private chunkDimensions: Vector2;
    private centerPoint: Vector2;
    private chunks: MapChunk[][];

    constructor(
        factory: IMapLocationFactory,
        dimensions: Vector2,
        chunkDimensions: Vector2
    ){
        this.factory = factory;
        this.dimensions = dimensions;
        this.chunkDimensions = chunkDimensions;
        this.centerPoint = new Vector2(Math.floor(dimensions.x / 2), Math.floor(dimensions.y / 2));

        this.chunks = [];
        for(let y = 0; y < dimensions.y; y++){
            this.chunks[y] = [];
            for(let x = 0; x < dimensions.x; x++){
                const position = new Vector2(x, y);
                const distanceFromCenter = Vector2.manhattanDistance(position, this.centerPoint);
                this.chunks[y][x] = new MapChunk(factory, chunkDimensions, new Vector2(x, y), distanceFromCenter);
            }
        }
    }

    get2DRepresentation(): IMapLocationVisual[][] {
        const result: IMapLocationVisual[][] = [];
        
        for(let y = 0; y < this.dimensions.y; y++){
            result[y] = [];
            for(let x = 0; x < this.dimensions.x; x++){
                const chunk = this.chunks[y][x];
                const chunkRepresentation = chunk.get2DRepresentation();
                for(let cy = 0; cy < chunkRepresentation.length; cy++){
                    for(let cx = 0; cx < chunkRepresentation[cy].length; cx++){
                        result[y * this.chunkDimensions.y + cy][x * this.chunkDimensions.x + cx] = chunkRepresentation[cy][cx];
                    }
                }
            }
        }

        return result;
    }

    private getChunkAndPosition(position: Vector2): {chunk:MapChunk, position:Vector2} {
        //Given the location position, we need to find the chunk that contains it
        const chunk = this.chunks[Math.floor(position.y / this.chunkDimensions.y)][Math.floor(position.x / this.chunkDimensions.x)];

        //Find the position of the location within the chunk
        const chunkPosition = new Vector2(position.x % this.chunkDimensions.x, position.y % this.chunkDimensions.y);

        return {chunk:chunk, position: chunkPosition};
    }
    getLocationData(position: Vector2): MapLocationData {
        const {chunk, position:chunkPosition} = this.getChunkAndPosition(position);

        //Get the location data from the chunk
        return chunk.getLocationData(chunkPosition);
    }
    clone(): IMap {
        //Get a new empty ChunkMap
        const newMap = new ChunkMap(this.factory, new Vector2(0,0), new Vector2(0,0));
        
        //Set the data of the new map to match this one
        newMap.setData(this.factory, this.dimensions, this.chunkDimensions, this.centerPoint, this.chunks);

        return newMap;
    }
    private setData(
        factory: IMapLocationFactory,
        dimensions: Vector2,
        chunkDimensions: Vector2,
        centerPoint: Vector2,
        chunks: MapChunk[][],
    ): void{
        this.factory = factory;
        this.dimensions = dimensions;
        this.chunkDimensions = chunkDimensions;
        this.centerPoint = centerPoint;
        this.chunks = chunks
    }

    setCleared(position: Vector2): void {
        const {chunk, position:chunkPosition} = this.getChunkAndPosition(position);
        chunk.setCleared(chunkPosition);
    }
    setRevealed(position: Vector2): void {
        const {chunk, position:chunkPosition} = this.getChunkAndPosition(position);
        chunk.setRevealed(chunkPosition);
    }
    setFloating(position: Vector2): void {
        const {chunk, position:chunkPosition} = this.getChunkAndPosition(position);
        chunk.setFloating(chunkPosition);
    }
    getDimensions(): Vector2 {
        return this.dimensions;
    }
}

export default ChunkMap;