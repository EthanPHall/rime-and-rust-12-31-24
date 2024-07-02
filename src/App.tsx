import React, { createContext, useState } from 'react';
import logo from './logo.svg';
import './App.css';
import './variables.css';
import CaravanParent from './components/caravan/CaravanParent/CaravanParent';
import MapParent from './components/map/MapParent/MapParent';
import CombatParent from './components/combat/CombatParent/CombatParent';
import EventParent from './components/events/EventParent/EventParent';
import progressionFlagsData from './data/global/progression-flags.json';

type ProgressionFlagsSeed = {
  [key: string]: boolean;
}

class ProgressionFlags{
  private flags:ProgressionFlagsSeed;

  constructor(flags:ProgressionFlagsSeed){
    this.flags = flags;
  }

  clone():ProgressionFlags{
    return new ProgressionFlags({...this.flags});
  }

  setFlag(flagName:string){
    this.flags[flagName] = true;
  }
  unsetFlag(flagName:string){
    this.flags[flagName] = false;
  }

  getFlag(flagName:string):boolean{
    return this.flags[flagName];
  }
}

type ProgressionContextType = {flags: ProgressionFlags, setFlags: (newFlags:ProgressionFlags) => void};
const ProgressionContext = createContext<ProgressionContextType>({flags: new ProgressionFlags(progressionFlagsData), setFlags: () => {}});

function App() {
  const [progressionFlags, setProgressionFlags] = React.useState<ProgressionFlags>(new ProgressionFlags(progressionFlagsData));

  return (
    <ProgressionContext.Provider value={{flags:progressionFlags, setFlags:setProgressionFlags}}>
      <div className="App">
        {/* <EventParent></EventParent> */}
        {/* <CombatParent></CombatParent> */}
        <CaravanParent></CaravanParent>
        {/* <MapParent></MapParent> */}
      </div>
    </ProgressionContext.Provider>
  );
}

export default App;
export {ProgressionContext, ProgressionFlags}
export type {ProgressionContextType}
