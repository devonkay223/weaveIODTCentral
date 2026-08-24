export default class DataEntry {
    constructor(jsonIn, entryStandard) {
        let keysStandard = Object.keys(entryStandard);
        let keysJSON = Object.keys(jsonIn);


        for (let i = 0; i < keysStandard.length; i++) {
            let val = entryStandard[keysStandard[i]]
            let content = ''
            console.log(val, keysStandard[i], jsonIn)
            if (jsonIn.hasOwnProperty(keysStandard[i])) {
                content = jsonIn[keysStandard[i]]
            }
            this.val = content
        }

        console.log(this)
    }



}