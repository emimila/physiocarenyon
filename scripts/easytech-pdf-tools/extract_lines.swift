import Foundation
import PDFKit

// Extract every word (PDFSelection) with its bounding box, then group into rows
// by Y coordinate. Output JSON-ish lines for inspection.

guard CommandLine.arguments.count >= 2 else {
    FileHandle.standardError.write("Usage: extract_lines.swift <input.pdf>\n".data(using: .utf8)!)
    exit(2)
}

let url = URL(fileURLWithPath: CommandLine.arguments[1])
guard let doc = PDFDocument(url: url) else { print("ERROR open"); exit(1) }

for i in 0..<doc.pageCount {
    guard let page = doc.page(at: i) else { continue }
    print("=== Page \(i+1) ===")
    let pageBounds = page.bounds(for: .mediaBox)
    print("page size: \(pageBounds.width) x \(pageBounds.height)")

    // Walk through every character index, get its bounds + char
    let str = page.string ?? ""
    if str.isEmpty { print("(no text)"); continue }

    struct Word { var text: String; var x: CGFloat; var y: CGFloat; var w: CGFloat; var h: CGFloat }
    var words: [Word] = []

    // Use selection per word approach by iterating selections
    let cnt = page.numberOfCharacters
    var current = ""
    var curX: CGFloat = 0; var curY: CGFloat = 0; var curW: CGFloat = 0; var curH: CGFloat = 0
    var lastY: CGFloat = -9999
    var lastEndX: CGFloat = -9999
    let chars = Array(str)
    for ci in 0..<min(cnt, chars.count) {
        let r = page.characterBounds(at: ci)
        let s = String(chars[ci])
        let isSpace = (s == " " || s == "\t" || s == "\n" || s == "\r")
        if isSpace {
            if !current.isEmpty {
                words.append(Word(text: current, x: curX, y: curY, w: curW, h: curH))
                current = ""
            }
            lastEndX = r.origin.x + r.size.width
            lastY = r.origin.y
            continue
        }
        // Detect implicit word break: large gap or different line
        if !current.isEmpty {
            let dy = abs(r.origin.y - curY)
            let dx = r.origin.x - lastEndX
            if dy > 2 || dx > (curH * 0.5) {
                words.append(Word(text: current, x: curX, y: curY, w: curW, h: curH))
                current = ""
            }
        }
        if current.isEmpty {
            curX = r.origin.x; curY = r.origin.y; curW = r.size.width; curH = r.size.height
            current = s
        } else {
            current += s
            curW = (r.origin.x + r.size.width) - curX
            curH = max(curH, r.size.height)
        }
        lastEndX = r.origin.x + r.size.width
        lastY = r.origin.y
    }
    if !current.isEmpty {
        words.append(Word(text: current, x: curX, y: curY, w: curW, h: curH))
    }

    // Sort by Y desc (top is high y in PDF coords), then X asc
    words.sort { (a, b) in
        if abs(a.y - b.y) > 3 { return a.y > b.y }
        return a.x < b.x
    }

    // Group into lines
    var lines: [[Word]] = []
    var current_line: [Word] = []
    var lineY: CGFloat = -9999
    for w in words {
        if current_line.isEmpty {
            current_line = [w]; lineY = w.y
        } else if abs(w.y - lineY) <= 3 {
            current_line.append(w)
        } else {
            lines.append(current_line); current_line = [w]; lineY = w.y
        }
    }
    if !current_line.isEmpty { lines.append(current_line) }

    for (li, line) in lines.enumerated() {
        let sortedLine = line.sorted { $0.x < $1.x }
        let y = sortedLine.first?.y ?? 0
        let parts = sortedLine.map { String(format: "[x=%.0f]%@", $0.x, $0.text) }
        print(String(format: "L%02d y=%.0f | %@", li+1, y, parts.joined(separator: "  ")))
    }
}
