const fs = require('fs');
const buildVolumes = require('../../src')
const path = require('path');
const ion = require("ion-js");

const main = async () => {

    if(process.argv.length < 4) {
        console.error("Usage: study2volumes <source> <target>")
        console.error("study2volumes generates DAGCOM Volume ION files from a DAGCOM Study ION file")
        console.error("")
        console.error("  <source> = directory containing input DAGCOM Study ION files")
        console.error("  <target> = directory that resulting DAGCOM Volume Ion files will be written")
        process.exit(-1)
    }

    const studies = fs.readdirSync(process.argv[2]).map((file) => {
        console.log(file);
        try {
            const bin = fs.readFileSync(path.join(process.argv[2], file))
            process.stdout.write(".")
            const study = ion.load(bin)
            //console.log(instance)
            return study
        } catch(ex) {
            console.log(ex + file)
        }
    });
    process.stdout.write("\n")

    console.log('building study....')
    let volumeIndex = 0
    studies.forEach((study) => {
        for(let [_studyUid, studyInner] of study.fields()) {
            const volumes = buildVolumes(studyInner)
            volumes.forEach((volume) => {
                const volumePath = 'volume-' + volumeIndex++ + '.ion'
                fs.writeFileSync(path.join(process.argv[3], volumePath), ion.dumpPrettyText(volume), {encoding:'utf8'})
            })
        }
    })
    console.log('done')
}

main()