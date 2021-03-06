const ptp = require("pdf-to-printer");
const path = require("path");
const fs = require('fs');
const swal = require('sweetalert2');
let PDFDocument = require('pdfkit');
const { BrowserWindow } = require('@electron/remote');
let printer = "";
let win;
let tempFolderPath = path.join(__dirname, './../tempPDF');
let systemFonts = ['Courier', 'Courier-Bold', 'Helvetica-Bold', 'Times-Roman', 'Times-Bold'];
let oFont = {
    'Courier': 'Courier',
    "Courier-Bold": "Courier Bold",
    "Helvetica-Bold": "Helvetica Bold",
    'Times-Roman': 'Times New Roman',
    'Times-Bold': 'Times New Roman - Bold',
    '/fonts/arial.ttf': "Arial",
    '/fonts/arial-bold.ttf': "Arial Bold",
    '/fonts/arial-narrow.ttf': "Arial Narrow",
    '/fonts/calibri.ttf': "Calibri",
    '/fonts/calibri-bold.ttf': "Calibri Bold",
    '/fonts/tahoma.ttf': "Tahoma",
    '/fonts/tahoma-bold.ttf': "Tahoma Bold"
}



window.addEventListener("DOMContentLoaded", () => {
    console.log("Printer module loaded");
    if (!fs.existsSync(tempFolderPath)) fs.mkdirSync(tempFolderPath);
    addUserAreaListener()
    addButtonListeners();
    updatePrinter();
    addSlidersListeners();
    addFontListeners();
})

let addFontListeners = () => {
    if (!localStorage.getItem("fontName") || localStorage.getItem("fontName") === "") localStorage.setItem("fontName", "Courier-Bold");
    let fontNameLabel = document.getElementById("fontName--label");
    //if 
    fontNameLabel.innerText = oFont[localStorage.getItem("fontName")];
    let fontNameSelect = document.getElementById('fontName--select');
    fontNameSelect.addEventListener("click", () => {
        chooseFont().then(() => {
            fontNameLabel.innerText = oFont[localStorage.getItem("fontName")];
        });
    })

}

let chooseFont = async () => {
    await swal.fire({
        title: 'Select custom font',
        input: 'select',
        inputOptions: {
            'Fonts': oFont
        },
        inputPlaceholder: 'Select a font',
        showCancelButton: true
    }).then((res) => {
        if (res.value === "") {
            return;
        }
        if (res.isConfirmed) localStorage.setItem("fontName", res.value);
    })
}

let addUserAreaListener = () => {
    if (!localStorage.getItem("user_input")) localStorage.setItem("user_input", `""`);
    let div = document.getElementById("user-input");
    div.value = JSON.parse(localStorage.getItem("user_input"));
    div.addEventListener("input", () => {
        localStorage.setItem("user_input", JSON.stringify(div.value));
    })
}

let addSlidersListeners = () => {
	// font size slider
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
    // copies amount slider
    let printLabel = document.getElementById("printLabel");
    let printAmountSlider = document.getElementById("printAmount");
    if (localStorage.getItem("printAmount")) {
    	printLabel.value = localStorage.getItem("printAmount");
    	printAmountSlider.value = localStorage.getItem("printAmount");
    } else {
    	localStorage.setItem("printAmount", printAmountSlider.value);
	printLabel.value = printAmountSlider.value;
    }
    printAmountSlider.addEventListener("input", () => {
    	localStorage.setItem("printAmount", printAmountSlider.value);
    	printLabel.value = printAmountSlider.value;
    })
    printLabel.addEventListener("input", () => {
    	if (printLabel.value != "" && printLabel.value > 0) localStorage.setItem("printAmount", printLabel.value);
    	printAmountSlider.value = localStorage.getItem("printAmount");
	printLabel.value = printAmountSlider.value
    })
    
}

let addButtonListeners = () => {
    let clearButton = document.getElementById("clear-button");
    let customPrinterButton = document.getElementById("customPrinter-button");
    let printButton = document.getElementById("print-button");
    clearButton.addEventListener("click", () => {
        document.getElementById("user-input").value = "";
        localStorage.setItem("user_input", "");
    })
    customPrinterButton.addEventListener("click", () => {
        choosePrinter();
    })
    printButton.addEventListener("click", () => {
        let tempInput = getUserInput();
        if (!tempInput || tempInput.length === 0 || tempInput === `""`) {
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
        //margin: 2,//*PostScriptPoint,
        margins: { top: 5, left: 2, right: 0, bottom: 0 },
        layout: "portrait"
    });
    doc.fontSize(fontSizeValue);
    let theTempFont = localStorage.getItem("fontName");
    if (!systemFonts.includes(theTempFont)) theTempFont = `${__dirname}${theTempFont}`;
    doc.font(theTempFont);
    let PDFPath = tempFolderPath + '/temporaryPDF.pdf';
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
            ],
            win32: [
                '-print-settings "fit"'
            ]

        }
        for (let i = 0; i < localStorage.getItem("printAmount"); i++) {
        	ptp
            	.print(PDFPath, newOptions)
        }
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
        if (res.isConfirmed) localStorage.setItem("printerName", res.value);
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
        iconColor: 'white',
        customClass: {
            popup: 'colored-toast'
        },
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