
class SaveSplicer {
    constructor(list, file, load, save, name) {
        this.list = list;
        this.file = file;
        this.load = load;
        this.save = save;
        this.name = name;
        this.data = null;
        
        file.addEventListener("change", (e) => {
            let f = e.target.files[0];
            name.value = f.name;
            
            let fr = new FileReader();
            fr.onload = () => {
                this.data = new Uint8Array(fr.result);
                let levels = getLevels(this.data);
                let names = getNames(this.data);
                let slots = getSlots(this.data);
                let infos = getInfos(this.data);
                let bools = getBools(this.data);
                
                let children = new Array(10);
                for (let i = 0; i < 10; ++i) {
                    let option = document.createElement("option");
                    option.innerText = formatName(names[i], levels[i], bools[i]);
                    option.characterSlot = slots[i];
                    option.characterInfo = infos[i];
                    option.characterName = names[i];
                    option.characterLevel = levels[i];
                    option.characterBool = bools[i];
                    children[i] = option;
                }
                list.replaceChildren(...children);
            }
            fr.readAsArrayBuffer(f);
        });
        load.addEventListener("click", (e) => {
            file.click();
        });
        save.addEventListener("click", (e) => {
            let slots = new Array(10);
            let infos = new Array(10);
            let bools = new Array(10);
            
            for (let i = 0; i < 10; ++i) {
                let option = this.list.options[i];
                slots[i] = option.characterSlot;
                infos[i] = option.characterInfo;
                bools[i] = option.characterBool;
            }
            
            setSlots(this.data, slots);
            setInfos(this.data, infos);
            setBools(this.data, bools);
            
            this.checksum();
            
            let blob = new Blob([this.data], {"type": "application/octet-stream"});
            let url = window.URL.createObjectURL(blob);
            
            let link = document.createElement("a");
            link.setAttribute("download", this.name.value);
            link.setAttribute("href", url);
            link.click();
            
            window.URL.revokeObjectURL(url);
        });
    }
    
    checksum() {
        let buf = this.data.subarray(0x19003B0, 0x19603B0);
        let hash = SparkMD5.ArrayBuffer.hash(buf, true);
        for (let i = 0; i < 16; ++i) {
            this.data[0x19003A0 + i] = hash.charCodeAt(i);
        }
    }
}

let lhs = new SaveSplicer(
    document.getElementById("lhs-list"),
    document.getElementById("lhs-file"),
    document.getElementById("lhs-load"),
    document.getElementById("lhs-save"),
    document.getElementById("lhs-name")
);

let rhs = new SaveSplicer(
    document.getElementById("rhs-list"),
    document.getElementById("rhs-file"),
    document.getElementById("rhs-load"),
    document.getElementById("rhs-save"),
    document.getElementById("rhs-name")
);

let shr = document.getElementById("shr");
let shl = document.getElementById("shl");

function shiftListener(sh, a, b) {
    sh.addEventListener("click", (e) => {
        if (a.data && b.data) {
            let src = a.list.options[a.list.selectedIndex];
            if (src) {
                let dst = b.list.options[b.list.selectedIndex];
                if (dst) {
                    dst.characterInfo = src.characterInfo.slice();
                    dst.characterSlot = src.characterSlot.slice();
                    dst.characterName = src.characterName.slice();
                    dst.characterLevel = src.characterLevel.slice();
                    dst.characterBool = (dst.characterName.length > 0? true : false);
                    dst.innerText = formatName(
                        dst.characterName,
                        dst.characterLevel,
                        dst.characterBool
                    );
                } else {
                    log("No destination character slot selected.");
                }
            } else {
                log("No source character slot selected.");
            }
        } else {
            log("Both sides need to have a save file open. (You may import the same file twice.)");
        }
    });
}

shiftListener(shr, lhs, rhs);
shiftListener(shl, rhs, lhs);

function formatName(name, level, active) {
    let decoder = new TextDecoder("utf-16");
    for (let j = 0; j < 32; j += 2) {
        if (name[j] == 0 && name[j + 1] == 0) {
            name = name.slice(0, j);
        }
    }
    name = decoder.decode(name);
    level = level[1] << 8 | level[0];
    if (name) {
        return name + " (RL" + level + ")" + (active? "" : " [DELETED]");
    } else {
        return "[EMPTY]";
    }
}

function getBools(buf) {
    let offset = 0x1901D04;
    let bools = new Array(10);
    for (let i = 0; i < 10; ++i) {
        bools[i] = (buf[offset + i] == 1);
    }
    return bools;
}

function setBools(buf, bools) {
    let offset = 0x1901D04;
    for (let i = 0; i < 10; ++i) {
        if (bools[i]) {
            buf[offset + i] = 1;
        } else {
            buf[offset + i] = 0;
        }
    }
}

function getSlots(buf) {
    let offset = 0x300;
    let slots = new Array(10);
    for (let i = 0; i < 10; ++i) {
        slots[i] = buf.slice(offset, offset + 0x280010);
        offset += 0x280010;
    }
    return slots;
}

function setSlots(buf, slots) {
    let offset = 0x300;
    for (let i = 0; i < 10; ++i) {
        buf.set(slots[i], offset);
        offset += 0x280010;
    }
}

function getInfos(buf) {
    let offset = 0x1901D0E;
    let infos = new Array(10);
    for (let i = 0; i < 10; ++i) {
        infos[i] = buf.slice(offset, offset + 0x24C);
        offset += 0x24C;
    }
    return infos;
}

function setInfos(buf, infos) {
    let offset = 0x1901D0E;
    for (let i = 0; i < 10; ++i) {
        buf.set(infos[i], offset);
        offset += 0x24C;
    }
}

function getNames(buf) {
    let offset = 0x1901D0E;
    let names = new Array(10);
    for (let i = 0; i < 10; ++i) {
        names[i] = buf.slice(offset, offset + 32);
        offset += 0x24C;
    }
    return names;
}

function setNames(buf, names) {
    let offset = 0x1901D0E;
    for (let i = 0; i < 10; ++i) {
        buf.set(names[i], offset);
        offset += 0x24C;
    }
}

function getLevels(buf) {
    let offset = 0x1901D30;
    let levels = new Array(10);
    for (let i = 0; i < 10; ++i) {
        levels[i] = buf.slice(offset, offset + 2);
        offset += 0x24C;
    }
    return levels;
}

function setLevels(buf, levels) {
    let offset = 0x1901D30;
    for (let i = 0; i < 10; ++i) {
        buf.set(levels[i], offset);
        offset += 0x24C;
    }
}

function log(msg) {
    let elem = document.getElementById("log");
    let text = document.createTextNode(msg);
    let br = document.createElement("br");
    elem.appendChild(text);
    elem.appendChild(br);
}
