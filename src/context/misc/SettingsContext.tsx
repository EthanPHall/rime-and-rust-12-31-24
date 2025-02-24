import React from 'react';
import speedSettings from '../../data/settings/speed-settings.json';
import IMap from '../../classes/exploration/IMap';
import { UniqueItemQuantitiesList } from '../../classes/caravan/Item';
import { ProgressionFlags } from '../../App';
import { Message } from '../../classes/caravan/Message';
import ISaveable from '../../classes/utility/ISaveable';
import { RandomGenerator, uniformIntDistribution, xoroshiro128plus } from 'pure-rand';

type SpeedSetting = {
    name:string;
    speedMult:number;
};

interface ISettingsManager{
    getCorrectTiming(baseTiming:number):number;
    getCurrentSpeedSetting():SpeedSetting;
    getSpeedSettings():SpeedSetting[];

    setSpeedSetting(name:string):void;

    clone():ISettingsManager;

    getSaveObject(
        map:ISaveable|null,
        inventory:ISaveable|null,
        explorationInventory:ISaveable|null,
        freeWorkers:number,
        totalWorkers:number,
        maxWorkers:number,
        flags:ISaveable|null,
        messages:ISaveable|null
    ):SaveObject

    /**
     * 
     * @returns A boolean indicating whether or not the map was loaded.
     */
    loadFromSaveObject(
        saveObject:SaveObject,
        map:ISaveable,
        inventory:ISaveable,
        explorationInventory:ISaveable,
        currentWorkers:React.MutableRefObject<number>,
        totalWorkers:React.MutableRefObject<number>,
        maxWorkers:React.MutableRefObject<number>,
        flags:ISaveable,
        messages:ISaveable
    ):boolean

    getNextRandomNumber(min?:number, max?:number):number;

    getOneClickCombatMove():boolean;
    setOneClickCombatMove(value:boolean):void;
}

class SettingsManager implements ISettingsManager{
    allSpeedSettings:SpeedSetting[] = speedSettings;
    currentSpeedSetting:SpeedSetting;

    private oneClickCombatMove:boolean = false;

    private seed:number;

    private rng:RandomGenerator = xoroshiro128plus(0);

    constructor(startingSpeedSetting:string|undefined = undefined, defaultSeed:number = Date.now() ^ (Math.random() * 0x100000000)){
        //Dummy value to prevent undefined errors
        this.currentSpeedSetting = this.allSpeedSettings[0];

        if(startingSpeedSetting){
            this.setSpeedSetting(startingSpeedSetting);
        }
        else{
            this.setSpeedSetting("Normal");
        }

        const savedSeed = localStorage.getItem("seed");
        let savedSeedInt:number|null = null;
        if(savedSeed){
            const savedSeedParsed = parseInt(savedSeed);
            if(!isNaN(savedSeedParsed)){
                savedSeedInt = savedSeedParsed;
            }
        }

        this.seed = savedSeedInt || defaultSeed;
        localStorage.setItem("seed", ""+this.seed)
        this.rng = xoroshiro128plus(this.seed);
    }

    getCorrectTiming(baseTiming:number):number{
        return baseTiming * this.currentSpeedSetting.speedMult;
    }

    getCurrentSpeedSetting():SpeedSetting{
        return this.currentSpeedSetting;
    }

    getSpeedSettings():SpeedSetting[]{
        return this.allSpeedSettings;
    }

    setSpeedSetting(name:string){
        const newSpeedSetting = this.allSpeedSettings.find((speedSetting) => speedSetting.name === name);

        if(newSpeedSetting){
            this.currentSpeedSetting = newSpeedSetting;
        }
        else{
            console.error("Speed setting not found: " + name);
        }
    }

    setSeed(newSeed:number){
        this.seed = newSeed;
    }
    getSeed():number{
        return this.seed;
    }

    getSaveObject(
        map:ISaveable|null,
        inventory:ISaveable|null,
        explorationInventory:ISaveable|null,
        currentWorkers:number,
        totalWorkers:number,
        maxWorkers:number,
        flags:ISaveable|null,
        messages:ISaveable|null
    ):SaveObject{
        const mapData:any = map ? map.createSaveObject() : null;
        const inventoryData:any = inventory ? inventory.createSaveObject() : null;
        const explorationInventoryData:any = explorationInventory ? explorationInventory.createSaveObject() : null;
        const messagesData:any = messages ? messages.createSaveObject(): null;
        const flagsData:any = flags ? flags.createSaveObject(): null;
        
        return {
            seed: this.seed,
            mapData: mapData,
            inventoryData:inventoryData,
            explorationInventoryData:explorationInventoryData,
            currentWorkers:currentWorkers,
            totalWorkers:totalWorkers,
            maxWorkers:maxWorkers,
            messagesData:messagesData,
            flagsData: flagsData
        }
    }

    loadFromSaveObject(
        saveObject:SaveObject,
        map:ISaveable,
        inventory:ISaveable,
        explorationInventory:ISaveable,
        currentWorkers:React.MutableRefObject<number>,
        totalWorkers:React.MutableRefObject<number>,
        maxWorkers:React.MutableRefObject<number>,
        flags:ISaveable,
        messages:ISaveable
    ){
        // if(
        //     !map.isDataValid(saveObject) ||
        //     !inventory.isDataValid(saveObject.inventoryData) ||
        //     !explorationInventory.isDataValid(saveObject.explorationInventoryData) ||
        //     !flags.isDataValid(saveObject.flagsData) ||
        //     !messages.isDataValid(saveObject.messagesData)
        // ){
        //     return;
        // }

        let mapWasLoaded:boolean = false;
        if(saveObject.mapData){
            map.loadSaveObject(saveObject);
            mapWasLoaded = true;
        }
        inventory.loadSaveObject(saveObject.inventoryData);
        explorationInventory.loadSaveObject(saveObject.explorationInventoryData);
        currentWorkers.current = saveObject.totalWorkers;
        totalWorkers.current = saveObject.totalWorkers;
        maxWorkers.current = saveObject.maxWorkers;
        flags.loadSaveObject(saveObject.flagsData);
        messages.loadSaveObject(saveObject.messagesData);
    
        return mapWasLoaded;
    }

    getNextRandomNumber = (min:number = 0, max:number = 9999):number => {
        const [result, nextRNG] = uniformIntDistribution(min, max, this.rng);
        this.rng = nextRNG;

        return result;
    }

    getOneClickCombatMove(): boolean {
        return this.oneClickCombatMove;
    }

    setOneClickCombatMove(value: boolean): void {
        this.oneClickCombatMove = value;
    }

    clone(): ISettingsManager {
        const newSettingsManager = new SettingsManager();
        newSettingsManager.currentSpeedSetting = this.currentSpeedSetting;
        newSettingsManager.seed = this.seed;
        newSettingsManager.rng = this.rng;
        newSettingsManager.oneClickCombatMove = this.oneClickCombatMove;

        return newSettingsManager;
    }
}

type SettingsContextType = {
    settingsManager:ISettingsManager;
    setSettingsManager:React.Dispatch<React.SetStateAction<ISettingsManager>>;
}

type SaveObject = {
    seed:number;
    mapData:any;
    inventoryData:any;
    explorationInventoryData:any;
    currentWorkers:number;
    totalWorkers:number;
    maxWorkers:number;
    messagesData:any;
    flagsData:any;
}

type RNGFunction = (min?:number, max?:number) => number; 

class SettingManagerDummy implements ISettingsManager{
    getCorrectTiming(baseTiming: number): number {
        throw new Error('Method not implemented.');
    }
    getCurrentSpeedSetting(): SpeedSetting {
        throw new Error('Method not implemented.');
    }
    getSpeedSettings(): SpeedSetting[] {
        throw new Error('Method not implemented.');
    }
    setSpeedSetting(name: string): void {
        throw new Error('Method not implemented.');
    }
    clone(): ISettingsManager {
        throw new Error('Method not implemented.');
    }
    getSaveObject(map: ISaveable | null, inventory: ISaveable | null, explorationInventory: ISaveable | null, freeWorkers: number, totalWorkers:number, maxWorkers:number, flags: ISaveable | null, messages: ISaveable | null): SaveObject {
        throw new Error('Method not implemented.');
    }
    loadFromSaveObject(saveObject: SaveObject, map: ISaveable, inventory: ISaveable, explorationInventory: ISaveable, currentWorkers: React.MutableRefObject<number>, totalWorkers: React.MutableRefObject<number>, maxWorkers: React.MutableRefObject<number>, flags: ISaveable, messages: ISaveable): boolean {
        throw new Error('Method not implemented.');
    }
    getNextRandomNumber(): number {
        throw new Error('Method not implemented.');
    }
    getOneClickCombatMove(): boolean {
        throw new Error('Method not implemented.');
    }
    setOneClickCombatMove(value: boolean): void {
        throw new Error('Method not implemented.');
    }
}

const SettingsContext = React.createContext<SettingsContextType>({settingsManager: new SettingManagerDummy(), setSettingsManager: () => {}});
export {SettingsContext, SettingsManager};
export type {SpeedSetting, ISettingsManager, SettingsContextType, SaveObject,RNGFunction};