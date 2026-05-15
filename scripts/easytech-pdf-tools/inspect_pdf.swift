import Foundation
import PDFKit
import CoreGraphics
import AppKit

// Usage: swift inspect_pdf.swift <input.pdf> <out_dir> <name_prefix>

guard CommandLine.arguments.count >= 4 else {
    FileHandle.standardError.write("Usage: inspect_pdf.swift <input.pdf> <out_dir> <prefix>\n".data(using: .utf8)!)
    exit(2)
}

let pdfPath = CommandLine.arguments[1]
let outDir = CommandLine.arguments[2]
let prefix = CommandLine.arguments[3]

let url = URL(fileURLWithPath: pdfPath)
guard let doc = PDFDocument(url: url) else {
    print("ERROR: cannot open PDF \(pdfPath)")
    exit(1)
}

let fm = FileManager.default
try? fm.createDirectory(atPath: outDir, withIntermediateDirectories: true)

print("=== PDF: \(pdfPath) ===")
print("pageCount: \(doc.pageCount)")
if let attrs = doc.documentAttributes {
    print("attrs: \(attrs)")
}
print("isLocked: \(doc.isLocked)")
print("isEncrypted: \(doc.isEncrypted)")
print("allowsCopying: \(doc.allowsCopying)")

// Render every page to PNG @ 300 DPI and dump text
let dpi: CGFloat = 300.0
let scale = dpi / 72.0

for i in 0..<doc.pageCount {
    guard let page = doc.page(at: i) else { continue }
    let mediaBox = page.bounds(for: .mediaBox)
    print("\n--- Page \(i+1) ---")
    print("mediaBox (pts): w=\(mediaBox.width) h=\(mediaBox.height)  (in: w=\(mediaBox.width/72) h=\(mediaBox.height/72))")

    // Text extraction
    let text = page.string ?? ""
    let textData = text.data(using: .utf8) ?? Data()
    let textPath = "\(outDir)/\(prefix)_page_\(i+1).txt"
    try? textData.write(to: URL(fileURLWithPath: textPath))
    print("text length (chars): \(text.count)")
    print("text bytes: \(textData.count) -> \(textPath)")

    // Render to PNG @ scale
    let pixelW = Int((mediaBox.width * scale).rounded())
    let pixelH = Int((mediaBox.height * scale).rounded())
    let cs = CGColorSpaceCreateDeviceRGB()
    guard let ctx = CGContext(
        data: nil,
        width: pixelW,
        height: pixelH,
        bitsPerComponent: 8,
        bytesPerRow: 0,
        space: cs,
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    ) else { continue }
    ctx.setFillColor(CGColor.white)
    ctx.fill(CGRect(x: 0, y: 0, width: pixelW, height: pixelH))
    ctx.scaleBy(x: scale, y: scale)
    page.draw(with: .mediaBox, to: ctx)
    if let cg = ctx.makeImage() {
        let nsimg = NSBitmapImageRep(cgImage: cg)
        if let png = nsimg.representation(using: .png, properties: [:]) {
            let pngPath = "\(outDir)/\(prefix)_page_\(i+1).png"
            try? png.write(to: URL(fileURLWithPath: pngPath))
            print("png: \(pixelW)x\(pixelH) px, \(png.count) bytes -> \(pngPath)")
        }
    }
}
print("DONE \(prefix)")
