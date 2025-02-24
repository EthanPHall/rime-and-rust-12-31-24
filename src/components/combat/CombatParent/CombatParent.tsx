import React, { FC, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import './CombatParent.css';
import CombatMap from '../CombatMap/CombatMap';
import ActionsDisplay from '../ActionsDisplay/ActionsDisplay';
import LootDisplay from '../LootDisplay/LootDisplay';
import HpDisplay from '../HPDisplay/HPDisplay';
import TurnDisplay from '../TurnDisplay/TurnDisplay';
import ComboSection from '../ComboSection/ComboSection';
import ComponentSwitcher from '../ComponentSwitcher/ComponentSwitcher';
import CombatMapManager from '../../../classes/combat/CombatMapManager';
import CombatManager from '../../../classes/combat/CombatManager';
import CombatAction, { Attack, Block, CombatActionSeed, CombatActionWithRepeat, CombatActionWithUses, Move, PullRange5, PushRange5, VolatileCanExplosion } from '../../../classes/combat/CombatAction';
import CombatMapData from '../../../classes/combat/CombatMapData';
import AreaOfEffect from '../../../classes/combat/AreaOfEffect';
import Directions from '../../../classes/utility/Directions';
import Vector2 from '../../../classes/utility/Vector2';
import MapUtilities from '../../../classes/utility/MapUtilities';
import CombatLocationData from '../../../classes/combat/CombatLocationData';
import CombatInfoDisplay, { CombatInfoDisplayProps } from '../CombatInfoDisplay/CombatInfoDisplay';
import CombatEnemy, { RustedBrute, RustedShambler } from '../../../classes/combat/CombatEnemy';
import CombatHazard, { BurningFloor, VolatileCanister, Wall } from '../../../classes/combat/CombatHazard';
import CombatPlayer from '../../../classes/combat/CombatPlayer';
import TurnManager from '../../../classes/combat/TurnManager';
import useTurnManager from '../../../hooks/combat/useTurnManager';
import IdGenerator from '../../../classes/utility/IdGenerator';
import CombatEntity from '../../../classes/combat/CombatEntity';
import CSSCombatAnimator from '../../../classes/animation/CSSCombatAnimator';
import useRefState from '../../../hooks/combat/useRefState';
import IActionExecutor from '../../../classes/combat/IActionExecutor';
import useActionExecutor from '../../../hooks/combat/useActionExecutor';
import useBasicActionExecutor from '../../../hooks/combat/useBasicActionExecutor';
import CombatMapFramerMotion from '../CombatMapFramerMotion/CombatMapFramerMotion';
import { AnimationPlaybackControls, TargetAndTransition, useAnimate } from 'framer-motion';
import MotionCombatAnimator from '../../../classes/animation/MotionCombatAnimator';
import { MotionAnimation } from '../../../classes/animation/CombatAnimationDetailsToMotionAnimation';
import CombatEnemyFactory from '../../../classes/combat/CombatEnemyFactory';
import TurnTaker, { isTurnTaker } from '../../../classes/combat/TurnTaker';
import CombatAnimationFactory, { CombatAnimationNames } from '../../../classes/animation/CombatAnimationFactory';
import useCombatHazardAnimations from '../../../hooks/combat/useCombatHazardAnimations';
import CombatActionFactory, { CombatActionNames, stringToCombatActionNames } from '../../../classes/combat/CombatActionFactory';

import combatEncounterRawJSON from "../../../data/combat/combat-encounters.json";
import combatMapsRawJSON from "../../../data/combat/combat-maps.json";
import enemyGroupsRawJSON from "../../../data/combat/enemy-groups.json";
import ICombatMapTemplateFactory from '../../../classes/combat/ICombatMapTemplateFactory';
import CombatMapTemplateFactoryJSON from '../../../classes/combat/CombatMapFactoryJSON';
import { SettingsContext } from '../../../context/misc/SettingsContext';
import PlayerCombatStats from '../../../classes/combat/PlayerCombatStats';
import analyzeDirectionInput from '../../../classes/utility/analyzeDirectionInput';
import HoverButton from '../../misc/HoverButton/HoverButton';
import EntitySpawner from '../../../classes/combat/EntitySpawner';
import CombatHazardFireballFactory from '../../../classes/combat/CombatHazardFireballFactory';

export enum EnemyType {
  RustedShambler = 'RustedShambler',
  RustedBrute = 'RustedBrute',
}

class EnemyStarterInfo{
  type: EnemyType;
  position: Vector2;

  constructor(type: EnemyType, position: Vector2){
    this.type = type;
    this.position = position;
  }
}

abstract class CombatMapTemplate{
  size: Vector2;
  enemies: CombatEnemy[];
  hazards: CombatHazard[];
  advanceTurn: () => void;

  constructor(size:Vector2, enemies: CombatEnemy[], hazards: CombatHazard[], advanceTurn: () => void){
    this.size = size;
    this.enemies = enemies;
    this.hazards = hazards;
    this.advanceTurn = advanceTurn;
  }
}

class CombatMapTemplate1 extends CombatMapTemplate{
  
  constructor(
    advanceTurn: () => void,
    getMap: () => CombatMapData,
    updateEntity: (id: number, newEntity: CombatEntity) => void,
    refreshMap: () => void,
    combatActionFactory: CombatActionFactory,
    addToComboList: (newAction: CombatAction) => void,
  ){
    const size:Vector2 = new Vector2(15, 15);
    const walls: Wall[] = Wall.createDefaultWalls(
      [
        {start: new Vector2(8, 8), end: new Vector2(12, 8)},
        {start: new Vector2(8, 9), end: new Vector2(8, 12)},
        {start: new Vector2(8, 12), end: new Vector2(12, 12)},
        {start: new Vector2(12, 8), end: new Vector2(12, 13)},
      ],
      getMap
    );
    // walls.push(Wall.createDefaultWall(new Vector2(7, 4)));

    const enemies: CombatEnemy[] = [];
    const hazards: CombatHazard[] = [
      new VolatileCanister(
        IdGenerator.generateUniqueId(), 
        '+', 
        'Volatile Canister', 
        new Vector2(7, 4),
        getMap, 
        false, 
        combatActionFactory, 
        addToComboList
      ),
      new VolatileCanister(
        IdGenerator.generateUniqueId(), 
        '+', 
        'Volatile Canister', 
        new Vector2(7, 4),
        getMap, 
        false, 
        combatActionFactory, 
        addToComboList
      ),
      new BurningFloor(IdGenerator.generateUniqueId(), new Vector2(7, 9), getMap, updateEntity, refreshMap),
      new BurningFloor(IdGenerator.generateUniqueId(), new Vector2(7, 10), getMap, updateEntity, refreshMap),
      new BurningFloor(IdGenerator.generateUniqueId(), new Vector2(7, 11), getMap, updateEntity, refreshMap),
      new BurningFloor(IdGenerator.generateUniqueId(), new Vector2(7, 12), getMap, updateEntity, refreshMap),
    ];

    super(size, enemies, [...walls, ...hazards], advanceTurn);
  }
}

class CombatMapTemplateBasic extends CombatMapTemplate{
  constructor(size:Vector2, enemies: CombatEnemy[], hazards: CombatHazard[], advanceTurn: () => void){
    super(size, enemies, hazards, advanceTurn);
  }
}

enum CombatEndState{
  UNDECIDED,
  VICTORY,
  DEFEAT
}

interface CombatParentProps {
  //TODO: Make this not be nullable
  combatEncounterKey:string|null;
  setCurrentEvent:React.Dispatch<React.SetStateAction<string | null>>;
  setCombatEncounterKey: React.Dispatch<React.SetStateAction<string | null>>;
  combatActionSeedList: CombatActionSeed[];
  combatPlayerStats: PlayerCombatStats;
}

const CombatParent: FC<CombatParentProps> = (
  {
    combatEncounterKey,
    setCurrentEvent,
    setCombatEncounterKey,
    combatActionSeedList,
    combatPlayerStats
  }
) => {
  
  const [turnManager, isTurnTakerPlayer] = useTurnManager();
  const [comboListForEffects, getComboList, setComboList] = useRefState<CombatActionWithRepeat[]>([]);

  const settingsContext = useContext(SettingsContext);

  //I was running into issues with closures I think. I was passing refreshMap() to the animator, but when it was called there,
  //the player wasn't up to date. That led to weird behavior where the player would move and be animated correctly the first time,
  //but then with the next action, the player would reset to its old position. So I made a hook where setPlayer also updates
  //a ref that everyone can use to make sure that they're using the most up-to-date player, and a function to get that ref's value,
  //so no more trying to get the player by value, it's all by reference now.
  const [playerForEffects, getPlayer, setPlayer] = useRefState<CombatPlayer>(new CombatPlayer(IdGenerator.generateUniqueId(), combatPlayerStats, '@', 'Player', new Vector2(0, 0), getCachedMap, turnManager.advanceTurn, resetActionUses));
  const [enemiesForEffects, getEnemies, setEnemies] = useRefState<CombatEnemy[]>([]);
  const [hazardsForEffects, getHazards, setHazards] = useRefState<CombatHazard[]>([]);

  const [entitySpawner, setEntitySpawner] = useState<EntitySpawner>(new EntitySpawner(turnManager, getHazards, getEnemies, setHazards, setEnemies));

  const [combatHazardFireballFactory] = useState<CombatHazardFireballFactory>(
    new CombatHazardFireballFactory(
      getCachedMap,
      updateEntity,
      refreshMap,
      turnManager.advanceTurn,
      addToComboList,
      executeActionsList,
      settingsContext.settingsManager,
      entitySpawner
    )
  )

  const combatActionFactory:CombatActionFactory = new CombatActionFactory(getCachedMap, updateEntity, refreshMap, getHazards, setHazards, getComboList, entitySpawner, combatHazardFireballFactory);
  const [combatMapTemplateFactory] = useState<ICombatMapTemplateFactory>(new CombatMapTemplateFactoryJSON(
    turnManager.advanceTurn,
    addToComboList,
    executeActionsList,
    getCachedMap,
    updateEntity,
    refreshMap,
    combatActionFactory,
    settingsContext.settingsManager,
    settingsContext.settingsManager.getNextRandomNumber,
    getPlayer(),
    setPlayer,
    entitySpawner
  ))
  
  const [mapTemplate, setMapTemplate] = useState<CombatMapTemplate>();
  const [baseMap, setBaseMap] = useState<CombatMapData>();
  const baseMapRef = useRef(baseMap);
  
  const [mapToSendOff, setMapToSendOff] = useState<CombatMapData>(getBaseMapClonePlusAddons());
  const mapToSendOffCached = useRef<CombatMapData>(mapToSendOff);
  const [aoeToDisplay, setAoeToDisplay] = useState<AreaOfEffect|null>(
    new AreaOfEffect(3, Directions.RIGHT, 1, true)
  );
 
  const [playerActions, setPlayerActions] = useState<CombatActionWithUses[]>(
    combatActionSeedList.map((seed) => {
      return new CombatActionWithUses(combatActionFactory.createAction(stringToCombatActionNames(seed.key), getPlayer().id), seed.uses);
    })
  );
  
  const [infoCardData, setInfoCardData] = useState<CombatInfoDisplayProps | null>(null);
  function hideCard(){
    setInfoCardData(null);
  }
  function showCard(title: string, description: string){
    setInfoCardData({title, description, hideCard});
  }


  const [combatEndState, setCombatEndState] = useState<CombatEndState>(CombatEndState.UNDECIDED);
  const combatEndStateRef = useRef(combatEndState);
  useEffect(() => {
    combatEndStateRef.current = combatEndState;
    if(combatEndState == CombatEndState.DEFEAT){
      setCombatEncounterKey(null);
      setCurrentEvent(getEncounter().defeatEventKey);
    }
    else if(combatEndState == CombatEndState.VICTORY){
      setCombatEncounterKey(null);
      setCurrentEvent(getEncounter().victoryEventKey);
    }
  }, [combatEndState]);


  
  const [mapScope, mapAnimate] = useAnimate();
  const [animator, setAnimator] = useState<MotionCombatAnimator>(new MotionCombatAnimator(getCachedMap, mapAnimate, combatEndStateRef));
  
  const actionExecutor:IActionExecutor = useActionExecutor(
    mapToSendOff, 
    comboListForEffects, 
    setComboList, 
    animator, 
    turnManager, 
    hazardsForEffects,
    enemiesForEffects,
    updateEntity,
    refreshMap
  );
  const actionExecutorRef = useRef<IActionExecutor>(actionExecutor);
  
  const allTurnTakers = useRef<TurnTaker[]>([getPlayer(), ...getEnemies(), ...getHazards().filter(hazard => isTurnTaker(hazard)).map(hazard => hazard as unknown as TurnTaker)]);

  const setupFinished = useRef(false);

  function getEncounter(){
    return combatEncounterKey ? combatEncounterRawJSON.encounters.find((data) => {
      return data.encounterKey == combatEncounterKey;
    }) || combatEncounterRawJSON.defaultEncounter : combatEncounterRawJSON.defaultEncounter;
  }


  useCombatHazardAnimations(mapToSendOff, animator, getPlayer, hazardsForEffects, actionExecutor.isExecuting, mapAnimate);


  const oneClickMoveRef = useRef(settingsContext.settingsManager.getOneClickCombatMove());
  useEffect(() => { oneClickMoveRef.current = settingsContext.settingsManager.getOneClickCombatMove() }, [settingsContext]);
  const [pauseProcessingSingleClickMove, setPauseProcessingSingleClickMove] = useState(false);
  const pauseProcessingSingleClickMoveRef = useRef(pauseProcessingSingleClickMove);
  useEffect(() => {
    pauseProcessingSingleClickMoveRef.current = pauseProcessingSingleClickMove;
  }, [pauseProcessingSingleClickMove]);

  function handleOneClickMovementInput(event:any){
    if(pauseProcessingSingleClickMoveRef.current){
      return;
    }

    if(!oneClickMoveRef.current){
      return;
    }

    if(!isTurnTakerPlayer()){
      return;
    }

    if(actionExecutor.isExecuting()){
      return;
    }

    let direction:Directions = analyzeDirectionInput(event);
    if(direction == Directions.NONE){
      return;
    }

    let playerMoveActionWithUses = playerActions.find(action => action.action.name == CombatActionNames.Move);
    if(!playerMoveActionWithUses || playerMoveActionWithUses.uses <= 0){
      return;
    }
    const playerMoveActionClone = playerMoveActionWithUses.action.clone();
    playerMoveActionClone.direction = direction;

    reduceActionUses(playerActions.indexOf(playerMoveActionWithUses));
    addToComboList(playerMoveActionClone);
  }

  useEffect(() => {
    document.addEventListener("keydown", handleOneClickMovementInput, false);

    return () => {
      document.removeEventListener("keydown", handleOneClickMovementInput, false);
    };
  }, []);

  useEffect(() => {
    setCurrentEvent(null);

    setupFinished.current = false;

    setCombatEndState(CombatEndState.UNDECIDED);

    const encounter = getEncounter();
    
    setMapTemplate(combatMapTemplateFactory.createMap(encounter.mapKey, settingsContext.settingsManager.getNextRandomNumber));
  }, [combatEncounterKey])

  useEffect(() => {
    if(mapTemplate && !setupFinished.current){
      setEnemies(mapTemplate.enemies);
      setHazards(mapTemplate.hazards);
  
      turnManager.finishSetup(allTurnTakers);

      setBaseMap(createMapFromTemplate(mapTemplate));
    }
  }, [mapTemplate]);

  useEffect(() => {
    baseMapRef.current = baseMap;

    if(mapTemplate && !setupFinished.current){
      refreshMap();
      setupFinished.current = true;
    }
  }, [baseMap]);

  useEffect(() => {
    refreshMap();
  }, [playerForEffects, enemiesForEffects, hazardsForEffects]);

  useEffect(() => {
    //Handle determining if the encounter is done yet.
    if(setupFinished.current){
      if(getPlayer().getHp() <= 0){
        combatEndStateRef.current = CombatEndState.DEFEAT;
        setCombatEndState(CombatEndState.DEFEAT);
      }
      else if(!getEnemies().find((enemy) => {
        return enemy.getHp() > 0;
      })){
        combatEndStateRef.current = CombatEndState.VICTORY;
        setCombatEndState(CombatEndState.VICTORY);
      }
    }

    allTurnTakers.current = [getPlayer(), ...getEnemies(), ...getHazards().filter(hazard => isTurnTaker(hazard)).map(hazard => hazard as unknown as TurnTaker)];
  }, [playerForEffects, enemiesForEffects]);

  useEffect(() => {
    actionExecutorRef.current = actionExecutor;
  }, [actionExecutor]);

  useEffect(() => {
    // if(setupFinished.current){
    //   animator.animate(
    //     [[CombatAnimationFactory.createAnimation(CombatAnimationNames.Bump, Directions.RIGHT, getPlayer().id)]]
    //   );
    // }


  }, [mapToSendOff]);

  function refreshMap():void{
    const newMap: CombatMapData = getBaseMapClonePlusAddons();

    mapToSendOffCached.current = newMap;
    setMapToSendOff(newMap);
  }
  function createMapFromTemplate(template: CombatMapTemplate): CombatMapData{
    const newMap: CombatMapData = new CombatMapData(template.size.x, template.size.y);

    return newMap; 
  }
  function getBaseMapClonePlusAddons(): CombatMapData{
    if(!baseMapRef.current){
      return new CombatMapData(0,0);
    }

    const newMap: CombatMapData = CombatMapData.clone(baseMapRef.current);

    getHazards().forEach(hazard => {
      if (hazard.getHp() <= 0) {
        return;
      }
      newMap.setLocationWithHazard(hazard);
    });
    getEnemies().forEach(enemy => {
      if (enemy.getHp() <= 0) {
        return;
      }
      newMap.setLocationWithEntity(enemy);
    });

    newMap.setLocationWithEntity(getPlayer());

    return newMap;
  }
  function getCachedMap(): CombatMapData{
    return mapToSendOffCached.current;
  }

  function resetActionUses() : void{
    const newPlayerActions: CombatActionWithUses[] = [...playerActions];

    newPlayerActions.forEach(action => {
      action.uses = action.maxUses;
    });
    setPlayerActions(newPlayerActions);
  }
  function reduceActionUses(index: number) : void{
    const newPlayerActions: CombatActionWithUses[] = [...playerActions];
    newPlayerActions[index].uses--;
    setPlayerActions(newPlayerActions);
  }

  function addToComboList(newAction: CombatAction) {
    const newWithRepeat: CombatActionWithRepeat = new CombatActionWithRepeat(newAction);
    const comboList = getComboList();

    const lastAction: CombatActionWithRepeat = comboList[comboList.length - 1];
    if (lastAction && lastAction.areEquivalent(newWithRepeat)) {
      lastAction.incrementRepeat();
      setComboList([...comboList]);
      return;
    }

    setComboList([...comboList, newWithRepeat]);
  }

  function updateEntity(id: number, newEntity: CombatEntity) {
    if (newEntity instanceof CombatHazard) {
      const newHazards = getHazards().map(hazard => hazard.id === id ? newEntity : hazard);
      setHazards(newHazards);
    } else if (newEntity instanceof CombatEnemy) {
      const newEnemies = getEnemies().map(enemy => enemy.id === id ? newEntity : enemy);
      setEnemies(newEnemies);
    } else if (newEntity instanceof CombatPlayer) {
      setPlayer(newEntity);
    }
  }

  async function framerMotionAnimate(animationList: MotionAnimation[]){
    for(let i = 0; i < animationList.length; i++){
      // await mapAnimate();
    }

  }



function executeActionsList() {
  if(!actionExecutorRef.current.isExecuting()) {
    actionExecutorRef.current.execute();
  }
}


  // function debug_movePlayer() {
  //   const newPlayer = new CombatPlayer(getPlayer().id, getPlayer().getHp(), getPlayer().maxHp, getPlayer().symbol, getPlayer().name, new Vector2(getPlayer().position.x + 1, getPlayer().position.y), getPlayer().advanceTurn, getPlayer().resetActionUses);
  //   setPlayer(newPlayer);
  // }
  // function debug_harmPlayer() {
  //   const newPlayer = new CombatPlayer(getPlayer().id, getPlayer().getHp() - 10, getPlayer().maxHp, getPlayer().symbol, getPlayer().name, getPlayer().position, getPlayer().advanceTurn, getPlayer().resetActionUses);
  //   setPlayer(newPlayer);
  // }
  function debug_endTurn() {
    turnManager.currentTurnTaker?.endTurn();
  }
  function debug_addNewHazard(){
    const newHazard = new BurningFloor(IdGenerator.generateUniqueId(), new Vector2(7, 7), getCachedMap, updateEntity, refreshMap);
    setHazards([...getHazards(), newHazard]);
  }

  const animationPlaybackControls = useRef<AnimationPlaybackControls | null>(null);
  function debug_Animate(){
    if(animationPlaybackControls.current){
      animationPlaybackControls.current.cancel();
      animationPlaybackControls.current = null;

      return;
    }

    // console.log(new Date().getSeconds());
    animationPlaybackControls.current = mapAnimate(mapScope.current, {x: [0, 100, -100, 300], y:[0, -100, 100, 300], color:[null, "#ff0000", "#ffbb4d", "#ffbb4d"]}, {times:[0, .4, .6, 1], duration: 2, repeat: Infinity, repeatType: "reverse"});
  }

  function debug_EndEncounter(){
    setCombatEndState(CombatEndState.VICTORY);
  }

  function debug_UpdateMap(){
    const newMap = CombatMapData.clone(mapToSendOff);
    setMapToSendOff(newMap);
  }

  return (
    <div className="combat-parent" data-testid="combat-parent">
        {/* <button onClick={debug_Animate}>Debug Animate Map</button>
        <button onClick={debug_addNewHazard}>Debug Add Hazard</button>
        <button onClick={debug_movePlayer}>Debug Move Player</button> */}
        {/* <button onClick={debug_harmPlayer}>Debug Harm Player</button> */}
        {/* <button onClick={debug_endTurn}>Debug End Turn</button> */}
        <div className='combat-parent-grid-parent'>
          <div className='combat-parent-map-actions-composite'>
            <CombatMapFramerMotion map={mapToSendOff} setMap={setBaseMap} aoeToDisplay={aoeToDisplay} scope={mapScope}></CombatMapFramerMotion>
            <ActionsDisplay pauseProcessingSingleClickMove={setPauseProcessingSingleClickMove} addToComboList={addToComboList} actions={playerActions} setActions={setPlayerActions} reduceActionUses={reduceActionUses} isTurnTakerPlayer={isTurnTakerPlayer} actionsAreExecuting={actionExecutor.isExecuting}></ActionsDisplay>
          </div>
            {/* <LootDisplay></LootDisplay> */}
            <HpDisplay hp={getPlayer().getHp()} maxHp={getPlayer().maxHp}></HpDisplay>
            <TurnDisplay currentTurnTaker={turnManager.currentTurnTaker}></TurnDisplay>
            <ComboSection comboList={comboListForEffects} setComboList={setComboList} resetActionUses={resetActionUses} actionExecutor={actionExecutor} isTurnTakerPlayer={isTurnTakerPlayer}></ComboSection>
            <ComponentSwitcher enemies={enemiesForEffects} hazards={hazardsForEffects} showCard={showCard}></ComponentSwitcher>
            {infoCardData != null && <CombatInfoDisplay {...infoCardData}></CombatInfoDisplay>}
          <div className='combat-settings-buttons'>
            <HoverButton 
              buttonText='One Click Move'
              popupText={`When enabled, you can move the player with the arrow keys and WASD without having to click the move button first. Currently ${settingsContext.settingsManager.getOneClickCombatMove() ? 'enabled' : 'disabled'}.`}
              onClick={
                () => {
                  settingsContext.setSettingsManager((prev) => {
                    const newSettingsManager = prev.clone();
                    newSettingsManager.setOneClickCombatMove(!newSettingsManager.getOneClickCombatMove());
                    // console.log(newSettingsManager.getOneClickCombatMove());

                    return newSettingsManager;
                  })
                }
              }
            />
            <button onClick={debug_EndEncounter}>DEBUG: End Encounter</button>
            <button onClick={debug_UpdateMap}>DEBUG: Update Map</button>
          </div>
        </div>
    </div>
  );
}

export default CombatParent;
export {CombatMapTemplate, CombatMapTemplateBasic, CombatEndState};