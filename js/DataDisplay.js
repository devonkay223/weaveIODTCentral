import DataEntry from "./DataEntry.js";

export default class DataDisplay {
    constructor(type, typestandardIn, jsonIn = '') {
        this.type = type
        this.content = jsonIn
        this.entryStandard = typestandardIn
        this.entries = []
        this.sec = ''
        // console.log(jsonIn)

        this.displayData()

    }

    displayData() {
        // create header for section
        // <button type="button" class="collapsible">Open Collapsible</button>
        if (this.type != "Loom") {
            let buttonNE = document.createElement("button")
            buttonNE.setAttribute("type", "button")
            // buttonNE.setAttribute("class", "newEntry")
            buttonNE.innerHTML = "new " + this.type
            document.getElementById("rightContent").appendChild(buttonNE)
            buttonNE.DataDisplay = this
            buttonNE.addEventListener("click", function () {
                buttonNE.DataDisplay.parseStandardEntries(buttonNE.DataDisplay.entryStandard, 1)
            });
        }
        let button = document.createElement("button")
        button.setAttribute("type", "button")
        button.setAttribute("class", "collapsible")
        button.innerHTML = this.type
        document.getElementById("rightContent").appendChild(button)
        button.addEventListener("click", function () {
            this.classList.toggle("active");
            var content = this.nextElementSibling;
            if (content.style.display === "block") {
                content.style.display = "none";
            } else {
                content.style.display = "block";
            }
        });





        let sec = document.createElement("div")
        sec.setAttribute("class", "datasection")
        sec.setAttribute("id", this.type)
        this.sec = sec
        // let secHeader = document.createElement("p")
        // secHeader.innerHTML = this.type;
        // secHeader.setAttribute("class", "dataLabel1")
        // sec.appendChild(secHeader)

        document.getElementById("rightContent").appendChild(sec)
        this.parseStandardEntries(this.entryStandard, 1)
        this.parseJSONIn(this.content)

        this.exportJSON()
    }


    // TODO add new entries for each subsec
    parseJSONIn(contentIn) {
        var keys = Object.keys(contentIn);
        for (let i = 0; i < keys.length; i++) {
            if (i > 0) {
                this.parseStandardEntries(this.entryStandard, 1, '', '', i)
            }
            let val = keys[i]
            this.entries.push(val)
            this.parseSubEntries(contentIn[val], i)


            let name = document.getElementById(this.type + "_Name_" + i)
            if (name && name.value == "(Name)") {
                name.value = val
            }
        }
        // console.log(this.entries)
    }

    parseSubEntries(contentIn, index) {
        var keys = Object.keys(contentIn);
        for (let i = 0; i < keys.length; i++) {
            let val = keys[i]
            // if (typeof (contentIn[val]) === 'object' && val != "Geometry") {
            //     console.log("iterate")
            //     // this.parseSubEntries(contentIn, index)
            // } else {
            let input = document.getElementById(this.type + "_" + val + "_" + index)
            // console.log(this.type + "_" + val + "_" + index, input, contentIn[val])
            if (input) {
                if (input.value == '') {
                    input.value = contentIn[val]
                }
            }
            // this.entries.push(val)

            // }

        }

    }



    parseStandardEntries(valIn, level, entryDiv = '', subsecLabel = '', indexIn = 0) {
        // console.log(indexIn)
        if (!entryDiv) {
            var newEntryGroup = document.createElement('div');
            newEntryGroup.setAttribute("class", "newEntry")
            this.sec.appendChild(newEntryGroup)
            entryDiv = newEntryGroup

        }
        if (subsecLabel) {
            var newDiv = document.createElement('div');
            newDiv.setAttribute("class", "pairBlocks")
            let title;
            if (subsecLabel == "Name") {
                title = document.createElement("input")
                title.setAttribute('type', 'text')
                title.setAttribute("class", "dataEntry")
                title.setAttribute("id", this.type + "_" + subsecLabel + "_" + indexIn)
                title.value = "(" + subsecLabel + ")"
            } else {
                title = document.createElement("p")
                title.setAttribute("class", "dataLabel")
                title.setAttribute("indent", level)
                title.setAttribute("id", this.type + "_" + subsecLabel + "_" + indexIn)
                title.style.setProperty("margin-left", level * 20 + "px")
                title.innerHTML = subsecLabel
            }

            newDiv.appendChild(title)

            entryDiv.appendChild(newDiv)
        }

        let standard = valIn
        // console.log(valIn, contentIn´)

        for (const val in standard) {
            if (typeof (standard[val]) === 'object' && val != "Geometry") {

                this.parseStandardEntries(standard[val], level + 1, entryDiv, val, indexIn)
                // console.log("its")

            } else {
                var newDiv = document.createElement('div');
                newDiv.setAttribute("class", "pairBlocks")
                let title = document.createElement("p")
                title.setAttribute("class", "dataLabel")
                title.setAttribute("indent", level)
                title.style.setProperty("margin-left", level * 20 + "px")
                title.innerHTML = val

                // if (this.content.hasOwnProperty(val)) {
                //     content = this.content[val]
                // }
                let entry = ''

                // if (subsecLabel != "Mappings") {
                let content = ''
                // console.log(this.content[val])


                entry = document.createElement("input")
                entry.setAttribute('type', 'text')
                entry.setAttribute("class", "dataEntry")
                entry.setAttribute("id", this.type + "_" + val + "_" + indexIn)
                entry.value = content
                // }
                // TODO this code is for the drop down option on the mappings if you want to

                // else {
                // let array = []
                // entry = document.createElement("select")
                // entry.setAttribute("class", "dataEntryMappings")
                // entry.setAttribute("id", this.type + "_" + val + "_" + indexIn)
                // for (var i = 0; i < array.length; i++) {
                //     var option = document.createElement("option");
                //     option.value = array[i];
                //     option.text = array[i];
                //     selectList.appendChild(option);
                // }
                // }

                newDiv.appendChild(title)
                newDiv.appendChild(entry)

                entryDiv.appendChild(newDiv)

                // if(val == "Geometry"){

                // }

            }
        }

    }

    exportJSON() {
        let sec = document.getElementById(this.type).childNodes
        let jsonOut = {}
        let prevClass= ''
        let jsonKeyLevel = ''

        console.log(sec)
        for (let i = 0; i < sec.length; i++) {
            let entry = sec[i]
            // console.log(entry, entry.childNodes.length)
            for (let j = 0; j < entry.childNodes.length; j++) {
                let pairs = entry.childNodes[j]
                // console.log(data)
                for (let k = 0; k < pairs.childNodes.length; k++) {
                    let input = pairs.childNodes[k]
                    if (input.class == "dataEntry" && j==0) {
                        jsonOut[input.value] = {}
                        jsonWorkingKey = jsonWorking[input.value]

                    }
                }
            }

        }

    }
}