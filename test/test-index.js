const assert = require('assert')
const buildVolumes = require('../src/index')
const fs = require('fs')
const path = require('path')
const ion = require("ion-js");
const util = require('util')

const loadIon = (path) => {
    const data = fs.readFileSync(path)
    return ion.load(data)
}

function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }   

describe('index', async () => {

    before(async() => {
    })

    it('exports', async () => {
        // Arrange

        // Act

        // Assert
        assert.notStrictEqual(buildVolumes, undefined)
    })

    it('CT', async () => {
        // Arrange
        //const ionDoc = loadIon('extern/dagcom-test-data/ion/study/ClearCanvas/CTStudy/study.ion')
        const ionDoc = loadIon('extern/dagcom-test-data/ion/study/ClearCanvas/MRStudy/study.ion')
        const studyUid = ionDoc.fields()[0][0]
        const study = ionDoc.get(studyUid)

        // Act
        const volumes = buildVolumes(study)
        console.log(JSON.stringify(volumes, null, 4))

        // Assert
        assert.notStrictEqual(volumes.length, 1)
    })


})
