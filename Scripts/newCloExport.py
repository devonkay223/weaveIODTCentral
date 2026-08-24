import fabric_api
import pattern_api
import ApiTypes
import json

globalXOffset = 2000000
globalYOffset = 2000000
width = 0
height = 0
patternPieceMap = {}
patternNaming={}

iodtData={}
selectedPatternIDs = []

fileNameIn = "demo2_4"
svgElements = []

formPieces = {}


pattern_api.ExportPatternJSON("/Users/devon/Documents/clo/Scripts/filesOut/"+ fileNameIn +"_CLOGENERATED.json")
try:
    with open("/Users/devon/Documents/clo/Scripts/filesOut/"+ fileNameIn +"_CLOGENERATED.json", "r") as file:
        data = json.load(file)

    #print("File data =", data)
except FileNotFoundError:
    print("Error: 'data.json' file was not found.")
    
    
    


def getPatternLines(patternNameIn):
    lines = []
    for pattern in data["PatternList"]:
        if pattern["Name"] == patternNameIn:
             lines = pattern["ShapeInfo"]["LineList"]
    return lines
    
def getPatternData(patternNameIn):
    lines = []
    id=0
    for pattern in data["PatternList"]:
        if pattern["Name"] == patternNameIn:
             lines = pattern["ShapeInfo"]["LineList"]
             id = pattern["ID"]
             if patternNameIn in patternPieces: 
                 selectedPatternIDs.append(id)
    return [lines, id]
    
def processSewnEdges():
    for pairs in data["SeamLinePairGroupList"]:
        v1 = pairs["PairList"][0]["First"]["ShapeID"]
        v2 = pairs["PairList"][0]["Second"]["ShapeID"]
        
        if v1 in patternPieceMap:
            pp1 = findSelectedEquivalent(v1)
        else: 
            print(v1, "not in output")
            break
        if v2 in patternPieceMap:
            pp2 = findSelectedEquivalent(v2)
        else: 
            print(v2, "not in output")
            break
        
        for pattern in iodtData["ArtworkAreas"]: 
            if iodtData["ArtworkAreas"][pattern]["PatternID"] == pp1: 
                p1Named = pattern
            if iodtData["ArtworkAreas"][pattern]["PatternID"] == pp2: 
                p2Named = pattern
            
        if [v1, v2] not in iodtData["ArtworkAreas"][p1Named]["SeamLinePairs"]: iodtData["ArtworkAreas"][p1Named]["SeamLinePairs"].append([v1, v2]) 
        #if v1 not in iodtData["Pattern"][p2Named]["SeamLinePairs"]: iodtData["Pattern"][p2Named]["SeamLinePairs"].append([v2, v1])
             
    
def findSelectedEquivalent(id):
    
     if patternPieceMap[id] in selectedPatternIDs: 
         print("out", id, patternPieceMap[id])
         return patternPieceMap[id]
     else: 
         print("recurse", id, patternPieceMap[id])
         return findSelectedEquivalent(patternPieceMap[id])

def createPatternMapping():
    #todo: create mapping of paired pattern pieces 
    #print(selectedPatternIDs)
    for instance in data["InstanceDataList"]: 
        opID = instance["OriginPatternID"]
        patternNaming[opID] = getPatternNameFromID(opID)
        #print(opID)
        for mapped in instance["InstancePatternIDArray"]:
            if opID not in selectedPatternIDs:
                #if mapped not in selectedPatternIDs: 
                    #mapped = patternPieceMap[mapped]
                patternPieceMap[opID] = (mapped)
    print(patternPieceMap) 
    print(patternNaming)
    ##return 0
    
def getPatternNameFromID(id):
     for pattern in data["PatternList"]: 
            if pattern["ID"] == id: 
                return pattern["Name"]
    
def convertLinesToSVG(linesListIn, fillColor):
    #svgOut = "<svg xmlns='http://www.w3.org/2000/svg'  version='1.1' viewBox='0 0 980 663'>"
    svgOut = ""
    path = "<path d='M " + str(int(linesListIn[0]["PointList"][0]["Position"]["x"] - globalXOffset)) + "," + str(int(linesListIn[0]["PointList"][0]["Position"]["y"] - globalYOffset))
    for line in linesListIn:
        index = 0
        for point in line["PointList"]: 
            if index !=0: 
                if index ==1: 
                    if point["PointType"] == "Bezier Curve":
                        path+= " C "
                    else: 
                        path += " L "
                x = int(point["Position"]["x"] - globalXOffset) #*0.5
                y = int(point["Position"]["y"] - globalYOffset) #*0.5
                path += str(x) + "," + str(y) + " "
            index += 1
    svgOut += path + "' fill='" + fillColor+ "'/>"
    #svgOut += "</svg>"
    
    svgFile.write(svgOut)
    
    return svgOut
    
    #print(svgOut)

def getMetaData(patternNameIn):
    pIndex = pattern_api.GetPatternIndex(patternNameIn)
    fIndex = fabric_api.GetFabricIndexForPattern(pIndex)
    fName = fabric_api.GetFabricName(fIndex)
    fInfo = fabric_api.GetFabricInformationW(fIndex)
    fColor = fInfo["ColorCode"]
    pData = getPatternData(patternNameIn)
    pLines = pData[0]
    pID = pData[1]
    
    #print(pID)
    
    svgOut = convertLinesToSVG(pLines, fColor)
    svgElements.append(svgOut)
    #print(svgElements)
  
    
    patternDataOut = {
        #"PatternName": patternNameIn,
        "Index": pIndex, 
        "ID": pID,
        "SVG": str(svgOut),
        "Color": fColor,
        "LayerSystem": fName,
        #"PatternPointsList": pLines, 
        #"SeamLinePairs": [], #instance matched pattern id/index/name
        "Mappings" : {
            "FormPieces" : [],
            "WeaveStructureCompiled" : ""
        }
    }
    
    return patternDataOut

def getFormData(formIn):    
    pData = getPatternData(formIn)
    pLines = pData[0]
    pID = pData[1]
  
    
    patternDataOut = {
        #"PatternName": patternNameIn,
        "Index": pID, 
        "LayerSystem": formIn,
        #"PatternPointsList": pLines, 
        #"SeamLinePairs": [], #instance matched pattern id/index/name
        "Geometry": pLines,
        "Mappings" : {
            "WeaveStructure" : ""
        }
    }
    
    return patternDataOut

    
def getPatternSizingInfo(ppIn):
    out = [200000,200000,0,0]
    for pattern in ppIn: 
        print(pattern)
        lines = getPatternLines(pattern)
        print(lines)
        for line in lines:
            for point in line["PointList"]: 
                x = point["Position"]["x"] 
                y = point["Position"]["y"] 
                if x< out[0]:
                    out[0] = x
                if y< out[1]:
                    out[1] = y
                if x > out[2]:
                    out[2] = x 
                if y  > out[3]:
                    out[3] = y 
                print(out[2], out[3])
    return out
                

    


patternPieces = pattern_api.GetSelectedPattern()
#print(patternPieces)

#firstP = getPatternLines(patternPieces[0])
#globalXOffset = firstP[2]["PointList"][0]["Position"]["x"]
#globalYOffset = firstP[2]["PointList"][0]["Position"]["y"]
#print(patternPieces[0], globalXOffset, globalYOffset)
pdOut = getPatternSizingInfo(patternPieces)
print(pdOut)
globalXOffset = pdOut[0]
globalYOffset = pdOut[1]
width = pdOut[2] - globalXOffset
height = pdOut[3]- globalYOffset
svgHeader =  "<svg xmlns='http://www.w3.org/2000/svg'  version='1.1' viewBox='0 0 " + str(int(width)) + " " + str(int(height)) +"'>"

svgFile = open("/Users/devon/Documents/clo/Scripts/filesOut/"+ fileNameIn +".svg", "x") 
svgFile.write(svgHeader)



iodtData["ArtworkAreas"] = {}
iodtData["FormPieces"] = {}
iodtData["PatternMap"] = patternPieceMap



for pattern in patternPieces:
    #print(getMetaData(pattern))
    iodtData["ArtworkAreas"][pattern]=getMetaData(pattern)

print(patternPieces)

createPatternMapping()
print(patternPieceMap)

for form in data["PatternList"]:
    fName = form["Name"]
    if fName not in patternPieces:
        print(fName)
        iodtData["FormPieces"][fName] = getFormData(fName)
        print(form["ID"], getPatternNameFromID(findSelectedEquivalent(form["ID"])))
        #iodtData["ArtworkAreas"][getPatternNameFromID(findSelectedEquivalent(form["ID"]))]["Mappings"]["FormPieces"].append(form["ID"])
        iodtData["ArtworkAreas"][getPatternNameFromID(findSelectedEquivalent(form["ID"]))]["Mappings"]["FormPieces"].append(fName)

    
#processSewnEdges()



iodtData["SVG"] = svgHeader + ' '.join(str(x) for x in svgElements) + "</svg>"
iodtData["NamesMap"] = patternNaming


print(selectedPatternIDs)
    
iodtFile = open("/Users/devon/Documents/clo/Scripts/filesOut/"+ fileNameIn +"_iodt.json", "x") 
json_iodt = json.dumps(iodtData, indent=4)
iodtFile.write(json_iodt)
iodtFile.close()
    
svgFile.write("</svg>")
svgFile.close()

#print(patternPieces)
