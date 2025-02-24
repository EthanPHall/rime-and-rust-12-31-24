import React, { FC, useCallback, useEffect, useState } from 'react';
import './ActionButton.css';
import { EnumType } from 'typescript';
import { Dir } from 'fs';
import { act } from 'react-dom/test-utils';
import { stringify } from 'querystring';
import { send } from 'process';
import CombatAction from '../../../classes/combat/CombatAction';
import Directions from '../../../classes/utility/Directions';
import { CombatActionWithUses } from '../../../classes/combat/CombatAction';
import analyzeDirectionInput from '../../../classes/utility/analyzeDirectionInput';

interface ActionButtonProps {
  addToComboList: (newAction: CombatAction) => void;
  action: CombatActionWithUses;
  actionIndex: number;
  reduceActionUses: (index:number) => void;
  buttonsShouldBeDisabled: () => boolean;
  pauseProcessingSingleClickMove: React.Dispatch<React.SetStateAction<boolean>>
}

const ActionButton: FC<ActionButtonProps> = ({addToComboList, action, actionIndex, reduceActionUses, buttonsShouldBeDisabled, pauseProcessingSingleClickMove}: ActionButtonProps) => {
  const [activateControls, setActivateControls] = useState<boolean>(false);
  const [direction, setDirection] = useState<Directions>(Directions.NONE);
 
  const handleDirectionInputs = useCallback((event:any) => {
    // if (activateControls && (event.key === "ArrowUp" || event.key === "w")) {
    //   setDirection(Directions.UP);
    // }
    // else if (activateControls && (event.key === "ArrowDown" || event.key === "s")) {
    //   setDirection(Directions.DOWN);
    // }
    // else if (activateControls && (event.key === "ArrowLeft" || event.key === "a")) {
    //   setDirection(Directions.LEFT);
    // }
    // else if (activateControls && (event.key === "ArrowRight" || event.key === "d")) {
    //   setDirection(Directions.RIGHT);
    // }

    if(!activateControls){
      return;
    }

    const direction = analyzeDirectionInput(event);
    setDirection(direction);
  }, [activateControls, setDirection]);

  useEffect(() => {
    document.addEventListener("keydown", handleDirectionInputs, false);

    return () => {
      document.removeEventListener("keydown", handleDirectionInputs, false);
    };
  }, [handleDirectionInputs]);

  useEffect(() => {
    if(direction === Directions.NONE){
      return;
    }

    switch(direction){
      case Directions.UP:
        action.action.direction = Directions.UP;
        break;
      case Directions.DOWN:
        action.action.direction = Directions.DOWN;
        break;
      case Directions.LEFT:
        action.action.direction = Directions.LEFT;
        break;
      case Directions.RIGHT:
        action.action.direction = Directions.RIGHT;
        break;
      }
    
    sendOffAction(action);

    setActivateControls(false);

  }, [direction]);

  function sendOffAction(actionToSendOff:CombatActionWithUses|null) : boolean{
    pauseProcessingSingleClickMove(false);

    if (actionToSendOff === null) {
      // console.log("No action to send off.");
      return false;
    } else {

      if(actionToSendOff.action.getShouldBypassUseLimits() === false){
        reduceActionUses(actionIndex);
      }
      addToComboList(actionToSendOff.action.getCorrectAction());

      return true;
    }
  }
  
  function setupForDirectionalInput() : void{
    if(action.uses <= 0 && !action.action.getShouldBypassUseLimits()){
      return;
    }

    if(!action.action.getIsDirectional()){
      sendOffAction(action);
    }
    else{
      pauseProcessingSingleClickMove(true);
      setDirection(Directions.NONE);
      setActivateControls(true);
    }
  }

  return (
    <div>
      <div className={`${activateControls ? "direction-input-cover" : ""}`}>
      </div>
      <button className="action-button" data-testid="action-button" onClick={setupForDirectionalInput} disabled={buttonsShouldBeDisabled()}>
        {`${action.action.getName()} x${action.action.getShouldBypassUseLimits() ? "Inf" : action.uses}`}
      </button>
    </div>
  );
}

export default ActionButton;
