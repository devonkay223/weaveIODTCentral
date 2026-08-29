## THIS FILE WILL BE REFACTORED WHEN SEAMLINE DATA IS ACCESSIBLE - including improved scoping, code order, and comments

import fabric_api
import pattern_api
import ApiTypes
import json
import utility_api
import os

globalXOffset = 2000000
globalYOffset = 2000000
width = 0
height = 0
patternPieceMap = {}
patternNaming={}

iodtData={}
selectedPatternIDs = []

path = utility_api.GetProjectFilePath().replace('.zprj', '') 
svgElements = []
jsonpath = path+"_CLOGENERATED.json"

##___Get json data from clo project ____
#check if file already exists (remove)
if os.path.exists(jsonpath):
    os.remove(jsonpath)
##create file
pattern_api.ExportPatternJSON(jsonpath)
try:
    with open(jsonpath, "r") as file:
        data = json.load(file)

   # print("File data =", data)
except FileNotFoundError:
    print("Error: file was not found.")



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
    
       
    
def findSelectedEquivalent(id):
     #print(selectedPatternIDs)
     if patternPieceMap[id] in selectedPatternIDs: 
         #print("out", id, patternPieceMap[id])
         return patternPieceMap[id]
     else: 
         #print("recurse", id, patternPieceMap[id])
         return findSelectedEquivalent(patternPieceMap[id])

# Create mapping if artwork (selected pieces) and pattern pieces based on instancing
def createPatternMapping():
    for instance in data["InstanceDataList"]: 
        opID = instance["OriginPatternID"]
        patternNaming[opID] = getPatternNameFromID(opID)
        for mapped in instance["InstancePatternIDArray"]:
            if opID not in selectedPatternIDs:
                patternPieceMap[opID] = (mapped)

    
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
    
    svgFile.write(svgOut)
    
    return svgHeader + svgOut + "</svg>"
    
# Construct Pattern Meta Data

def getMetaData(patternNameIn):
    pIndex = pattern_api.GetPatternIndex(patternNameIn)
    fIndex = fabric_api.GetFabricIndexForPattern(pIndex)
    fName = fabric_api.GetFabricName(fIndex)
    fInfo = fabric_api.GetFabricInformationW(fIndex)
    fColor = fInfo["ColorCode"]
    pData = getPatternData(patternNameIn)
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

#Construct form metadata

def getFormData(formIn):    
    pData = getPatternData(formIn)
    pLines = pData[0]
    pID = pData[1]
  
    
    patternDataOut = {
        "Index": pID, 
        "LayerSystem": formIn,
        "Geometry": pLines,
        "Mappings" : {
            "WeaveStructure" : ""
        }
    }
    
    return patternDataOut

 # determine bounds of pattern based on pattern sizing - used for svg sizing and zeroing    
def getPatternSizingInfo(ppIn):
    out = [200000,200000,0,0]
    for pattern in ppIn: 
        #print(pattern)
        lines = getPatternLines(pattern)
        #print(lines)
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
    return out
                
def create_unique_file(path):
    base, ext = os.path.splitext(path)
    index = 0

    while True:
        if index == 0:
            filename = path
        else:
            filename = f"{base}_{index}{ext}"

        try:
            with open(filename, "x", encoding="utf-8") as f:
                f.write("")

            return filename

        except FileExistsError:
            index += 1
    


#Get all selected pattern pieces (should be user constructed artwork)
patternPieces = pattern_api.GetSelectedPattern()
if len(patternPieces)<2:
    print("Error: Please select artwork pieces.")
    

# Create SvgHeader with necessary imformation
pdOut = getPatternSizingInfo(patternPieces) 
globalXOffset = pdOut[0]
globalYOffset = pdOut[1]
width = pdOut[2] - globalXOffset
height = pdOut[3]- globalYOffset
svgHeader =  "<svg xmlns='http://www.w3.org/2000/svg'  version='1.1' viewBox='0 0 " + str(int(width)) + " " + str(int(height)) +"'>"

# Create SVG file with SVg header
svgPath = create_unique_file(path + ".svg")
svgFile = open(svgPath, "w", encoding="utf-8")
svgFile.write(svgHeader)


#Establish and populated iodt data 
iodtData["ArtworkAreas"] = {}
iodtData["FormPieces"] = {}
#iodtData["PatternMap"] = patternPieceMap



for pattern in patternPieces:
    iodtData["ArtworkAreas"][pattern]=getMetaData(pattern)


createPatternMapping()

for form in data["PatternList"]:
    #print(findSelectedEquivalent((form["ID"])))
    fName = form["Name"]
    if fName not in patternPieces:
        #print(fName)
        iodtData["FormPieces"][fName] = getFormData(fName)
        #print(form["ID"], getPatternNameFromID(findSelectedEquivalent(form["ID"])))
        #iodtData["ArtworkAreas"][getPatternNameFromID(findSelectedEquivalent(form["ID"]))]["Mappings"]["FormPieces"].append(form["ID"])
        iodtData["ArtworkAreas"][getPatternNameFromID(findSelectedEquivalent(form["ID"]))]["Mappings"]["FormPieces"].append(fName)

    
#processSewnEdges()


iodtData["SVG"] = svgHeader + ' '.join(str(x) for x in svgElements) + "</svg>"
#iodtData["NamesMap"] = patternNaming


iodtFilePath = create_unique_file(path+"_iodt.json") 
iodtFile = open(iodtFilePath, "w", encoding="utf-8") 
json_iodt = json.dumps(iodtData, indent=4)
iodtFile.write(json_iodt)
iodtFile.close()
    
svgFile.write("</svg>")
svgFile.close()

pattern_api.ExportPatternJSON(jsonpath+"fileout")
#print(patternPieces)



