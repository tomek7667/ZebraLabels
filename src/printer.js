const ptp = require("pdf-to-printer");
const path = require("path");
const fs = require('fs');
const swal = require('sweetalert2');
let PDFDocument = require('pdfkit');
const { BrowserWindow } = require('@electron/remote');
let printer = "";
let win;
let tempFolderPath = path.join(__dirname, "./../tempPDF").replaceAll(" ", "\\ ");

window.addEventListener("DOMContentLoaded", () => {
    console.log("Printer module loaded");
    if (!fs.existsSync(tempFolderPath)) fs.mkdirSync(tempFolderPath);
    addUserAreaListener()
    addButtonListeners();
    updatePrinter();
})

let addUserAreaListener = () => {
    if (!localStorage.getItem("user_input")) localStorage.setItem("user_input", "");
    let div = document.getElementById("user-input");
    div.addEventListener("input", () => {
        localStorage.setItem("user_input", JSON.stringify(div.value));
    })
}

let addButtonListeners = () => {
    let clearButton = document.getElementById("clear-button");
    let customPrinterButton = document.getElementById("customPrinter-button");
    let printButton = document.getElementById("print-button");
    let sizeLabel = document.getElementById("sizeLabel");
    let sizeFontSlider = document.getElementById("fontSize");
    if (localStorage.getItem("fontSize")) {
        sizeLabel.innerText = localStorage.getItem("fontSize");
        sizeFontSlider.value = localStorage.getItem("fontSize");
    } else {
        localStorage.setItem("fontSize", sizeFontSlider.value);
    }
    sizeFontSlider.addEventListener("input", () => {
        localStorage.setItem("fontSize", sizeFontSlider.value);
        sizeLabel.innerText = sizeFontSlider.value;
    })
    clearButton.addEventListener("click", () => {
        document.getElementById("user-input").value = "";
        localStorage.setItem("user_input", "");
    })
    customPrinterButton.addEventListener("click", () => {
        choosePrinter();
    })
    printButton.addEventListener("click", () => {
        let tempInput = localStorage.getItem("user_input");
        if (tempInput.length === 0) {
            showWarning("You are trying to print empty label!");
        } else {
            printLabel(tempInput, localStorage.getItem("printerName"), localStorage.getItem("fontSize"));
        }
    })
}

let updatePrinter = () => {
    let storagePrinter = localStorage.getItem("printerName");
    if (!storagePrinter) {
        let zebra = getZebraPrinter();
        if (!zebra) {
            swal.fire({
                title: "Attention!",
                text: "You need to choose a custom printer, because I couldn't find Zebra printer.",
                type: "warning",
                showCancelButton: false,
                allowOutsideClick: false
            }).then(() => {
                choosePrinter(false);
            });
        } else {
            localStorage.setItem("printerName", zebra);
        }
    }
}

let printLabel = (userText, userPrinter, fontSizeValue) => {
    let labelsText = JSON.parse(userText).split("\n");
    const PostScriptPoint = 2.83464567;
    let doc = new PDFDocument({
        size: [38*PostScriptPoint, 19*PostScriptPoint],
        margin: 2*PostScriptPoint,
        layout: "portrait"
    });
    doc.fontSize(fontSizeValue);
    doc.font('Courier-Bold')
    let PDFPath = tempFolderPath + "/temporaryPDF.pdf";
    for (let labelText of labelsText) {
        doc.text(labelText, {align: "center"});
    }
    let theStream = fs.createWriteStream(PDFPath);
    doc.pipe(theStream);
    doc.end();
    theStream.on('finish', () => {
        let newOptions = {
            printer: userPrinter,
            unix:  [
                "-o sides=one-sided",
                "-o media=Custom.38x19mm",
            ]
        }
        ptp
            .print(PDFPath, newOptions)
            .then(r => console.log);
        showWarning("Your label will now print.", "success");
    })
}

let choosePrinter = (showCancelButton=true) => {
    win = new BrowserWindow({width: 800, height: 600, show: false });
    let printers = win.webContents.getPrinters();
    let oPrinters = {};
    for (let printer of printers) {
        oPrinters[printer.name] = printer.displayName;
    }
    win = null;
    swal.fire({
        title: 'Select field validation',
        input: 'select',
        inputOptions: {
            'System printers': oPrinters
        },
        inputPlaceholder: 'Select a printer',
        showCancelButton: showCancelButton,
        allowOutsideClick: showCancelButton
    }).then((res) => {
        if (res.value === "") {
            if (!showCancelButton) updatePrinter();
            return;
        }
        localStorage.setItem("printerName", res.value);
    })
}

let getZebraPrinter = () => {
    win = new BrowserWindow({width: 800, height: 600, show: false });
    let printers = win.webContents.getPrinters();
    let finalName = false;
    let printerZebraName = "zebra";
    for (let printer of printers) {
        let dp = printer.name.toLowerCase();
        if (dp.includes(printerZebraName)) finalName = printer.name;
        printerZebraName = dp.includes(printerZebraName) ?
            printer.name :
            printerZebraName;
    }
    win = null;
    return finalName;
}

const getUserInput = () => {
    if (!localStorage.getItem("user_input")) return "";
    return localStorage.getItem("user_input");
}

let showWarning = (text, type="warning") => {
    const Toast = swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2500,
        timerProgressBar: true,
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', swal.stopTimer)
            toast.addEventListener('mouseleave', swal.resumeTimer)
        }
    })

    Toast.fire({
        icon: type,
        title: text
    })
}