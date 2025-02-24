import { CombatMapTemplate, CombatMapTemplateBasic } from "../../components/combat/CombatParent/CombatParent";
import ICombatMapTemplateFactory from "./ICombatMapTemplateFactory";
import mapJSONData from "../../data/combat/combat-maps.json";
import enemyGroupsJSONData from "../../data/combat/enemy-groups.json";
import CombatHazard from "./CombatHazard";
import CombatEnemy from "./CombatEnemy";
import CombatPlayer from "./CombatPlayer";
import Vector2 from "../utility/Vector2";
import ICombatEnemyFactory from "./ICombatEnemyFactory";
import CombatEnemySymbolFactory from "./CombatEnemySymbolFactory";
import CombatAction from "./CombatAction";
import CombatMapData from "./CombatMapData";
import CombatEntity from "./CombatEntity";
import ICombatHazardFactory from "./ICombatHazardFactory";
import CombatHazardSymbolFactory from "./CombatHazardSymbolFactory";
import CombatActionFactory from "./CombatActionFactory";
import { ISettingsManager, RNGFunction, SettingsManager } from "../../context/misc/SettingsContext";
import EntitySpawner from "./EntitySpawner";

class CombatMapTemplateFactoryJSON implements ICombatMapTemplateFactory{
    private advanceTurn: () => void;
    private addActionToList: (action: CombatAction) => void;
    private executeActionsList: () => void;
    private getMap: () => CombatMapData;
    private updateEntity: (id:number, newEntity: CombatEntity) => void;
    private refreshMap: () => void;

    private actionFactory: CombatActionFactory;
    private settingsManager:ISettingsManager;
    private rngFunction:RNGFunction;
    private player: CombatPlayer;
    private setPlayer: (newValue: CombatPlayer) => void;
    private entitySpawner: EntitySpawner;

    constructor(
        advanceTurn: () => void,
        addActionToList: (action: CombatAction) => void,
        executeActionsList: () => void,
        getMap: () => CombatMapData,
        updateEntity: (id:number, newEntity: CombatEntity) => void,
        refreshMap: () => void,
        actionFactory: CombatActionFactory,
        settingsManager:ISettingsManager,
        rngFunction:RNGFunction,
        player: CombatPlayer,
        setPlayer: (newValue: CombatPlayer) => void,
        entitySpawner: EntitySpawner
    ){
        this.advanceTurn = advanceTurn;
        this.addActionToList = addActionToList;
        this.executeActionsList = executeActionsList;
        this.getMap = getMap;
        this.updateEntity = updateEntity;
        this.refreshMap = refreshMap;
        this.actionFactory = actionFactory;
        this.settingsManager = settingsManager;
        this.rngFunction = rngFunction;
        this.player = player;
        this.setPlayer = setPlayer;
        this.entitySpawner = entitySpawner;
    }

    createMap(mapKey: string, rngFunction:RNGFunction): CombatMapTemplate {
        let mapRepresentation = mapJSONData.maps.find((data) => {return mapKey == data.mapKey});
        if(!mapRepresentation){
            console.log("No Map with key " + mapKey + " found, using first map instead.");
            mapRepresentation = mapJSONData.maps[0];

            if(!mapRepresentation){
                throw Error("No combat maps found.");
            }
            if(mapRepresentation.mapRepresentation.length == 0){
                throw Error("Map with key " + mapKey + " is blank, no rows.");
            }
        }

        //Convert each row of the representation to an array of strnings, each representing a space
        //on the map.
        const mapRepresentationModified:string[][] = mapRepresentation.mapRepresentation.map((row) => {
            return row.split(mapJSONData.separator);
        })

        //get the length of the longest row
        let longestRowLength = 0;
        mapRepresentationModified.forEach((row) => {
            if(row.length > longestRowLength){
                longestRowLength = row.length;
            }
        })

        if(longestRowLength == 0){
            throw Error("Map with key " + mapKey + " is blank, no columns.");
        }

        const size:Vector2 = new Vector2(mapRepresentationModified.length, longestRowLength);

        //Determine what enemies and hazards may spawn on this map, and the chances for each player spawn point
        const rng:number = rngFunction(0,99);
        let cumulativeChance:number = 0;
        const enemyGroup = mapRepresentation.potentialEnemyGroups.find((group) => {
            cumulativeChance += group.chance;
            return rng <= cumulativeChance;
        }) || mapJSONData.defaultEnemyGroup;

        cumulativeChance = 0;
        const hazardGroup = mapRepresentation.potentialHazardGroups.find((group) => {
            cumulativeChance += group.chance;
            return rng <= cumulativeChance;
        }) || mapJSONData.defaultHazardGroup;

        //Loop through each space and determine if it is blank, enemy, hazard, or player spawn.
        //Keep track of the positions of each important space
        const enemyPositions:Vector2[] = [];
        const hazardPositions:Vector2[] = [];
        const potentialPlayerSpawns:Vector2[] = [];
        mapRepresentationModified.forEach((row, y) => {
            row.forEach((mapLocation, x) => {
                if(mapJSONData.enemySymbols.includes(mapLocation)){
                    enemyPositions.push(new Vector2(x,y));
                }
                else if(mapJSONData.hazardSymbols.includes(mapLocation)){
                    hazardPositions.push(new Vector2(x,y));
                }
                else if(mapJSONData.playerSpawnSymbols.includes(mapLocation)){
                    potentialPlayerSpawns.push(new Vector2(x,y));
                }
                //Else, that means the space is blank so just ignore it.
            });
        });

        //Instantiate and use factories to create the enemies and hazards
        const enemyFactory:ICombatEnemyFactory = new CombatEnemySymbolFactory(
            mapRepresentationModified, 
            enemyGroup.enemyGroupKey,
            this.advanceTurn,
            this.addActionToList,
            this.executeActionsList,
            this.getMap,
            this.updateEntity,
            this.refreshMap,
            this.settingsManager,
            rngFunction
        );
        const enemies:CombatEnemy[] = enemyFactory.createGivenPositions(enemyPositions);

        const hazardFactory:ICombatHazardFactory = new CombatHazardSymbolFactory(
            mapRepresentationModified,
            hazardGroup.hazardGroupKey,
            this.getMap,
            this.updateEntity,
            this.refreshMap,
            this.actionFactory,
            this.addActionToList,
            rngFunction,
            this.advanceTurn,
            this.addActionToList,
            this.executeActionsList,
            this.settingsManager,
            this.entitySpawner
        )
        const hazards:CombatHazard[] = hazardFactory.createGivenPositions(hazardPositions);

        //Spawn the player at a random spawn point
        const playerSpawnPoint = potentialPlayerSpawns[rngFunction(0, potentialPlayerSpawns.length-1)];
        this.player.position = playerSpawnPoint;
        this.setPlayer(this.player);

        return new CombatMapTemplateBasic(
            size,
            enemies,
            hazards,
            this.advanceTurn
        )
    }
}

export default CombatMapTemplateFactoryJSON;