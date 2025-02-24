import IRimeEventAction from "./IRimeEventAction";

class RimeEventActionGoto implements IRimeEventAction {
    private setSceneId:(newId:number)=>void;
    private idToSetItTo:number;

    constructor(setSceneId:(newId:number)=>void, idToSetItTo:number){
        this.setSceneId = setSceneId;
        this.idToSetItTo = idToSetItTo;
    }

    execute(): void {
        this.setSceneId(this.idToSetItTo);
    }

    getName(): string {
        return "Continue";
    }

    getRequisiteItems(): string[] {
        return [];
    }
}

export default RimeEventActionGoto;