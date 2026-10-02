import ApiTypes
import json
import os
import fabric_api
import pattern_api
import utility_api


## Globals Defs
# globalOffsets: used to find bottom left corner point and align with origin for building svg definition 
#                   starts with large value in order to search for the closest (smallest)_ x and y values to origin 
globalXOffset = 2000000 
globalYOffset = 2000000
# data values
patternPieceMap = {} # map of which pattern form pieces correspond to artwork pattern pieces 
selectedPatternIDs = [] # list of ids for selected pattern pieces (ie artwork pieces)
svgElements =[] # list of all generated svg path created for artwork pattern pieces 
svgFile # ref to svg file so paths can be written in 
data # data from clo genearted JSON file 
seamLinePairs = {}

# ____ SVG _____

def convertLinesToSVG(linesListIn, fillColor):
    ''' Converts pattern data (lines and color) to svg path. Appends path info to generated SVG file and returns for pattern data entry. '''
    global svgFile
    svgOut = ""
    svgPath = "<path d='M " + str(int(linesListIn[0]["PointList"][0]["Position"]["x"] - globalXOffset)) + "," + str(int(linesListIn[0]["PointList"][0]["Position"]["y"] - globalYOffset))
    for line in linesListIn:
        index = 0
        for point in line["PointList"]: 
            if index !=0: 
                if index ==1: 
                    if point["PointType"] == "Bezier Curve":
                        svgPath+= " C "
                    else: 
                        svgPath += " L "
                x = int(point["Position"]["x"] - globalXOffset) #*0.5
                y = int(point["Position"]["y"] - globalYOffset) #*0.5
                svgPath += str(x) + "," + str(y) + " "
            index += 1
    svgOut += svgPath + "' fill='" + fillColor+ "'/>"
    
    svgFile.write(svgOut) # write path to artwork svg file
    
    return svgOut
    


# ____ Pattern Piece _____

def getPatternNameFromID(idIn):
    ''' Look up pattern name from pattern id in project JSON.  '''
    for pattern in data["PatternList"]: 
        if pattern["ID"] == idIn: 
            return pattern["Name"]


def getPatternData(patternNameIn, dataIn = data):
    '''
    [redundant] Extracts shape line info for pattern piece from project JSON and checks if the piece is one of the selected pieces. 
    '''
    global selectedPatternIDs
    lines = []
    id=0
    for pattern in dataIn["PatternList"]:
        if pattern["Name"] == patternNameIn:
            lines = pattern["ShapeInfo"]["LineList"]
            id = pattern["ID"]
            if patternNameIn in patternPieces: 
                selectedPatternIDs.append(id)
    return [lines, id]


def zeroPiecePatternData(formNameIn, formIndexIn, selectedEqIn):
    '''
    Temporarily moves all form pattern pieces to the "zeroed" location of the artwork, then gets geometry data, and returns pattern peices to origional location. 
    This enables the geometry to be normalized to the artwork position for reconstruction of seamline relationships in 3D visualizations 
    '''
    # temp relocate form piece to artwork svg "zeroed" location 
    artPos = pattern_api.GetPatternPiecePos(selectedEqIn)
    currentPos = pattern_api.GetPatternPiecePos(formIndexIn)
    pattern_api.SetPatternPiecePos(formIndexIn, artPos[0] - globalXOffset, artPos[1] - globalYOffset)

    # # get project path location 
    path = utility_api.GetProjectFilePath().replace('.zprj', '') 
    jsonpathTemp = path+ "_CLOGENERATED_TEMP.json"

    # ##___Get temp json data from clo project ____
    # # check if file already exists (remove)
    if os.path.exists(jsonpathTemp):
        os.remove(jsonpathTemp)
    # ## create file
    pattern_api.ExportPatternJSON(jsonpathTemp)
    try:
        with open(jsonpathTemp, "r") as file:
            tempData = json.load(file)
    except FileNotFoundError:
        print("Error: file was not found.")

    # get geometry data at new location
    tempPData = getPatternData(formNameIn, tempData)

    # return pattern piece to prior location
    pattern_api.SetPatternPiecePos(formIndexIn, currentPos[0], currentPos[1])

    # delete temp json file
    if os.path.exists(jsonpathTemp):
        os.remove(jsonpathTemp)
    else:
        print("The generated temp file does not exist")

    return tempPData


def genSeamLineData():
    global pairs

    for seam in data["SeamLinePairGroupList"]:
        first  =seam["PairList"][0]["First"]
        second  = seam["PairList"][0]["Second"]
        pairs[first["ShapeID"]] =  [first["LineID"], second["ShapeID"], second["LineID"]]


def getShapeSeams(formIDIn, geometryIn):
    if pairs[formID]: 
        for line in geometryIn: 
            if line["ID"] == pairs[formID][0]:
                line["ID"]["SeamPair"] = [pairs[formID][1][2]]

    print geometryIn
    return geometryIn


def getFormData(formNameIn, formIndexIn, selectedEqIn): 
    '''
    Creates form pattern piece entry and sources data for index, name, id, svg path, layer systems, and form relationship 
    '''
    pData = zeroPiecePatternData(formNameIn, formIndexIn, selectedEqIn)
    pLines = pData[0]
    pID = pData[1]
    sData = getShapeSeams(pID, pLines)

    patternDataOut = {
        "ID": pID, 
        "LayerSystem": formNameIn,
        "Geometry": sData,
        "Mappings" : {
            "WeaveStructure" : ""
        }
    }
    
    return patternDataOut


def getArtworkData(patternNameIn):
    '''
    Creates artwork pattern piece entry and sources data for index, name, id, svg path, layer systems, and form relationship 
    '''
    global svgElements
    
    pIndex = pattern_api.GetPatternIndex(patternNameIn)
    fIndex = fabric_api.GetFabricIndexForPattern(pIndex)
    fName = fabric_api.GetFabricName(fIndex)
    fInfo = fabric_api.GetFabricInformationW(fIndex)
    fColor = fInfo["ColorCode"]
    pData = getPatternData(patternNameIn) # extracts pattern data from project JSON 
    pLines = pData[0] 
    pID = pData[1]
        
    svgOut = convertLinesToSVG(pLines, fColor)
    svgElements.append(svgOut)  
    
    patternDataOut = {
        "Index": pIndex, 
        "ID": pID,
        "SVG": str(svgOut),
        "Color": fColor,
        "LayerSystem": fName,
        "Mappings" : {
            "FormPieces" : [],
            "WeaveStructureCompiled" : ""
        }
    }
    
    return patternDataOut


# ____ Pattern Meta Data _____

def getPatternLines(patternNameIn):
    '''[redundant]  Extracts shape line info for pattern piece from project JSON '''
    lines = []
    for pattern in data["PatternList"]:
        if pattern["Name"] == patternNameIn:
            lines = pattern["ShapeInfo"]["LineList"]
    return lines

def getPatternSizingInfo(ppIn):
    ''' Determine bounds of artwork based on point locations - used for svg sizing and zeroing all pattern pieces'''
    out = [200000,200000,0,0]
    for pattern in ppIn: 
        lines = getPatternLines(pattern)
        for line in lines:
            for point in line["PointList"]: 
                x = point["Position"]["x"] 
                y = point["Position"]["y"] 
                if x < out[0]:
                    out[0] = x
                if y < out[1]:
                    out[1] = y
                if x > out[2]:
                    out[2] = x 
                if y > out[3]:
                    out[3] = y 
    return out


def createPatternMapping():
    '''
    Create mapping of artwork (selected pieces) and all other pattern pieces based on instancing. 
    '''
    global patternPieceMap, selectedPatternIDs
    for instance in data["InstanceDataList"]: 
        opID = instance["OriginPatternID"]
        for mapped in instance["InstancePatternIDArray"]:
            if opID not in selectedPatternIDs:
                patternPieceMap[opID] = (mapped)


def findSelectedEquivalent(id):
    '''
    Create mapping of artwork (selected pieces) and all other pattern pieces based on instancing. 
    '''
    if patternPieceMap[id] in selectedPatternIDs: 
        return patternPieceMap[id]
    else: 
        return findSelectedEquivalent(patternPieceMap[id])


# _____ Other _____
def createUnique_File(pathIn):
    base, ext = os.path.splitext(pathIn)
    index = 0

    while True:
        if index == 0:
            filename = pathIn
        else:
            filename = f"{base}_{index}{ext}"
        try:
            with open(filename, "x", encoding="utf-8") as f:
                f.write("")
            return filename
        except FileExistsError:
            index += 1


    
def main():
    # create driver function that is called in main - reduce amount of code in main function
    # improve error handling for users

    global globalXOffset, globalYOffset, svgFile, data


    # get project path location 
    path = utility_api.GetProjectFilePath().replace('.zprj', '') 
    jsonpath = path +  "_CLOGENERATED.json"

    ##___Get json data from clo project ____
    # check if file already exists (remove)
    if os.path.exists(jsonpath):
        os.remove(jsonpath)
    ## create file
    pattern_api.ExportPatternJSON(jsonpath)
    try:
        with open(jsonpath, "r") as file:
            data = json.load(file)
    except FileNotFoundError:
        print("Error: file was not found.")
        

    #Get all selected pattern pieces (should be user constructed artwork)
    patternPieces = pattern_api.GetSelectedPattern()
    if len(patternPieces)<2:
        print("Error: Please select artwork pieces.")
        
    # Extract size and placement of artwork
    pdOut = getPatternSizingInfo(patternPieces)
    globalXOffset = pdOut[0]
    globalYOffset = pdOut[1]
    width = pdOut[2] - globalXOffset
    height = pdOut[3]- globalYOffset

    # Create SVG file 
    svgHeader =  "<svg xmlns='http://www.w3.org/2000/svg'  version='1.1' viewBox='0 0 " + str(int(width)) + " " + str(int(height)) +"'>"
    svgPath = create_unique_file(path + ".svg")
    svgFile = open(svgPath, "w", encoding="utf-8")
    svgFile.write(svgHeader)



    #Establish iodt data entries
    iodtData["ArtworkAreas"] = {}
    iodtData["FormPieces"] = {}

    # for each selected pattern piece in the artwork create entry and populate 
    for pattern in patternPieces:
        iodtData["ArtworkAreas"][pattern]=getArtworkData(pattern)

    # create map of which pieces from the patterbn correspond to pieces in the artwork
    createPatternMapping()
    genSeamLineData()
    
    # for each pattern piece in the form create entry and populate 
    for form in data["PatternList"]:
        fName = form["Name"]
        if fName not in patternPieces:
            selectedEqu = findSelectedEquivalent(form["ID"])
            iodtData["FormPieces"][fName] = getFormData(fName, pattern_api.GetPatternIndex(fName), pattern_api.GetPatternIndex(getPatternNameFromID(selectedEqu)))
            iodtData["ArtworkAreas"][getPatternNameFromID(selectedEqu)]["Mappings"]["FormPieces"].append(fName)




    # create entry in the data type that contains the full svg definitiion
    iodtData["SVG"] = svgHeader + ' '.join(str(x) for x in svgElements) + "</svg>"

    # create iodt file and populate
    iodtFilePath = create_unique_file(path+"_iodt.json") 
    iodtFile = open(iodtFilePath, "w", encoding="utf-8") 
    json_iodt = json.dumps(iodtData, indent=4)
    iodtFile.write(json_iodt)
    iodtFile.close()
        
    # populate svg file 
    svgFile.write("</svg>")
    svgFile.close()

    if os.path.exists(jsonpath):
        os.remove(jsonpath)
    else:
        print("The generated file does not exist")
        
    print(jsonpath)


if __name__ == "__main__":
    main()


