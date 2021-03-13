const getHash = require('./getHash')

function getGroup(groupName, sopInstance, groupList) {
    const group = groupList[groupName]
    for(let [groupHash, value] of group.fields()) {
        for(let hash of sopInstance._groups.elements()) {
            if(hash.stringValue() === groupHash) {
                return value
            }
        }
    }
}

const getIntString = (value, defaultValue) => {
    if(!value) {
        return defaultValue
    }
    return parseInt(value.stringValue())
}

const getFloatString = (value, defaultValue) => {
    if(!value) {
        return defaultValue
    }
    return parseFloat(value.stringValue())
}

// sorts from most positive image position to most negative image position
// e.g. (from positive Z to negative Z for axials, positive X to negative X for sagittal, positive y to negative y for coronal)
const getSortedSopInstances = (groupsAndSopInstances) => {
    // sort by InstanceNumber to get them in roughly the right order
    groupsAndSopInstances.sopInstances.sort((a,b) => {
        const ain = parseInt(a.InstanceNumber)
        const bin = parseInt(b.InstanceNumber)
        return ain - bin
    })

    groupsAndSopInstances.sopInstances.forEach(sopInstance => {
        const ipp = sopInstance.ImagePositionPatient.stringValue().split('\\')
        sopInstance.ipp = {x: parseFloat(ipp[0]), y: parseFloat(ipp[1]), z: parseFloat(ipp[2])}
    })


    // calculate unit vector between first and second image
    const iv = {
        x : groupsAndSopInstances.sopInstances[0].ipp.x - groupsAndSopInstances.sopInstances[1].ipp.x,
        y : groupsAndSopInstances.sopInstances[0].ipp.y - groupsAndSopInstances.sopInstances[1].ipp.y,
        z : groupsAndSopInstances.sopInstances[0].ipp.z - groupsAndSopInstances.sopInstances[1].ipp.z,
    }
    const ivmag = getVectorMagnitude(iv)
    const uv = {
        x: iv.x / ivmag,
        y: iv.y / ivmag,
        z: -Math.abs(iv.z / ivmag) // force increasing Z
    }
    // calculate the dot product between unit vector and image patient position
    groupsAndSopInstances.sopInstances.forEach(sopInstance => {
        sopInstance.dot = (sopInstance.ipp.x * uv.x + sopInstance.ipp.y * uv.y + sopInstance.ipp.z * uv.z)
    })


    // sort by the dot product of the unit vector and ipp
    groupsAndSopInstances.sopInstances.sort((a,b) => {
        return a.dot - b.dot
    })

    return groupsAndSopInstances.sopInstances
    /*
    // create image position patient vector
    groupsAndSopInstances.sopInstances.forEach(sopInstance => {
        const ipp = sopInstance.ImagePositionPatient.stringValue().split('\\')
        sopInstance.ipp = {x: ipp[0], y: ipp[1], z: ipp[2]}
    })

    // create a vector between two images
    const iv = {
        x : groupsAndSopInstances.sopInstances[0].x - groupsAndSopInstances.sopInstances[1].x,
        y : groupsAndSopInstances.sopInstances[0].y - groupsAndSopInstances.sopInstances[1].y,
        z : groupsAndSopInstances.sopInstances[0].z - groupsAndSopInstances.sopInstances[1].z,
    }

    return groupsAndSopInstances.sopInstances.sort((a,b) => {
        if(!a.ipp) {
            a.ipp = (a.)
        }
        if(!b.ipp) {
            b.ipp = (b.ImagePositionPatient.stringValue().split('\\'))
        }
        const iv = { 
            x: parseFloat(a.ipp[0]) - parseFloat(b.ipp[0]),
            y: parseFloat(a.ipp[1]) - parseFloat(b.ipp[1]),
            z: parseFloat(a.ipp[2]) - parseFloat(b.ipp[2]),
        }
        const dota = iv.x * a.ipp[0] + iv.y
        return getVectorMagnitude(iv)
    })
    */
}

const getSliceIntervalVector = (firstSopInstance, secondSopInstance) => {
    const firstipp = (firstSopInstance.ImagePositionPatient.stringValue().split('\\'))
    const secondipp = (secondSopInstance.ImagePositionPatient.stringValue().split('\\'))
    return {
        x: parseFloat(firstipp[0]) - parseFloat(secondipp[0]),
        y: parseFloat(firstipp[1]) - parseFloat(secondipp[1]),
        z: parseFloat(firstipp[2]) - parseFloat(secondipp[2]),
    }
}

const getVectorMagnitude = (vec) => {
    return Math.sqrt(Math.pow(vec.x,2) + Math.pow(vec.y,2) + Math.pow(vec.z,2) )
}

const groupsAndSopInstancesToVolumes = (groupsAndSopInstances, study) => {
    const volumes = []
    const groupList = study.get('groups')
    const sortedSopInstances = getSortedSopInstances(groupsAndSopInstances) 
    const firstSopInstance = sortedSopInstances[0]
    const secondSopInstance = sortedSopInstances[1]
    const generalSeries = getGroup('generalSeries', firstSopInstance, groupList)
    const frameOfReference = getGroup('frameOfReference', firstSopInstance, groupList)
    const generalEquipment = getGroup('generalEquipment', firstSopInstance, groupList)
    const generalImage = getGroup('generalImage', firstSopInstance, groupList)
    const imagePlane = getGroup('imagePlane', firstSopInstance, groupList)
    const imagePixel = getGroup('imagePixel', firstSopInstance, groupList)

    const sliceIntervalVector = getSliceIntervalVector(firstSopInstance, secondSopInstance)
    const sliceSpacing = getVectorMagnitude(sliceIntervalVector)
    const volume = {
        imageFrames: [],
        Modality: generalSeries.Modality.stringValue(),
        SeriesDescription: generalSeries.SeriesDescription.stringValue(),
        FrameOfReferenceUID: frameOfReference.FrameOfReferenceUID.stringValue(),
        //PixelPaddingValue: generalEquipment.PixelPaddingValue,
        PixelSpacing: imagePlane.PixelSpacing.stringValue(),
        ImageOrientationPatient: imagePlane.ImageOrientationPatient.stringValue(),
        SamplesPerPixel: imagePixel.SamplesPerPixel.numberValue(),
        PhotometricInterpretation: imagePixel.PhotometricInterpretation.stringValue(),
        Rows: imagePixel.Rows.numberValue(),
        Columns: imagePixel.Columns.numberValue(),
        BitsAllocated: imagePixel.BitsAllocated.numberValue(),
        BitsStored: imagePixel.BitsStored.numberValue(),
        HighBit: imagePixel.HighBit.numberValue(),
        PixelRepresentation: imagePixel.PixelRepresentation.numberValue(),
        RescaleSlope: getFloatString(firstSopInstance.RescaleSlope, 1),
        RescaleIntercept: getFloatString(firstSopInstance.RescaleIntercept, 0),
        WindowCenter: getFloatString(firstSopInstance.WindowCenter), 
        WindowWidth: getFloatString(firstSopInstance.WindowWidth),
        ImagePositionPatient: firstSopInstance.ImagePositionPatient.stringValue(),
        sliceIntervalVector: sliceIntervalVector,
        sliceSpacing: sliceSpacing
    }

    sortedSopInstances.map((sopInstance) => {
        //console.log(sopInstance)
        const imageFramePath = sopInstance.SOPInstanceUID.stringValue() + '.dcm.ion-0.htj2k'
        const imageFrame = {
            path: imageFramePath,
            ImagePositionPatient: sopInstance.ImagePositionPatient.stringValue()
        }
        volume.imageFrames.push(imageFrame)
    })
 
    volumes.push(volume)

    return volumes
}

const seriesToVolumes = (series, study) => {
    const instanceList = series.get('instances')

    const groupsAndSopInstances = {}

    for(let [_sopInstanceUid, sopInstance] of instanceList.fields()) {
        const groupHash = getHash(sopInstance._groups)
        if(!groupsAndSopInstances[groupHash]) {
            groupsAndSopInstances[groupHash] = {
                groups: sopInstance._groups,
                sopInstances: []
            }
        }
        groupsAndSopInstances[groupHash].sopInstances.push(sopInstance)
    }
    let volumes = []
    Object.keys(groupsAndSopInstances).map((groupHash) => {
        if(groupsAndSopInstances[groupHash].sopInstances.length > 10) {
            volumes = volumes.concat(groupsAndSopInstancesToVolumes(groupsAndSopInstances[groupHash], study))
        }
    })
    return volumes
}

const buildVolumes = (study) => {
    //console.log(study)
    const seriesList = study.get('series')
    let studyVolumes = []
    for(let [_seriesUid, series] of seriesList.fields()) {
        const seriesVolumes = seriesToVolumes(series, study)
        studyVolumes = studyVolumes.concat(seriesVolumes)
    }
    return studyVolumes
}

module.exports = buildVolumes