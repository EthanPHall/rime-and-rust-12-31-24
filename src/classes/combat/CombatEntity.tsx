import IdGenerator from "../utility/IdGenerator";
import Vector2 from "../utility/Vector2";

abstract class CombatEntity{
    id: number;  
    hp: number;
    maxHp: number;
    symbol: string;
    name: string;
    position: Vector2;
    description: string;
  
    constructor(id: number, hp: number, maxHp: number, symbol: string, name: string, position: Vector2, description: string = ""){
      this.id = id;
      this.hp = hp;
      this.maxHp = maxHp;
      this.symbol = symbol;
      this.name = name;
      this.position = position;
      this.description = description;
    }

    abstract clone(): CombatEntity;
  }

export default CombatEntity;