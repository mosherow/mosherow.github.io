// Turns a photo into a "shape" image for the dot animation:
// the subject is cut out from the background (transparent everywhere else)
// and converted to grayscale. The website reads this image and places
// dots where the subject is, brighter where the photo is brighter.
//
// Usage:
//   swift tools/make_shape.swift <input photo> <output.png> <height in px> [cropX cropY cropW cropH]
// Crop values are fractions of the photo (0 to 1), measured from the top-left.

import AppKit
import CoreImage
import CoreImage.CIFilterBuiltins
import Foundation
import Vision

let args = CommandLine.arguments
guard args.count >= 4 else {
    print("usage: make_shape.swift input output.png height [cropX cropY cropW cropH]")
    exit(1)
}
let inURL = URL(fileURLWithPath: args[1])
let outURL = URL(fileURLWithPath: args[2])
let targetH = CGFloat(Double(args[3]) ?? 700)

guard var ci = CIImage(contentsOf: inURL, options: [.applyOrientationProperty: true]) else {
    print("could not load \(args[1])"); exit(1)
}

// Optional crop (fractions, top-left origin).
if args.count >= 8,
   let cx = Double(args[4]), let cy = Double(args[5]),
   let cw = Double(args[6]), let ch = Double(args[7]) {
    let e = ci.extent
    let rect = CGRect(x: e.minX + e.width * cx,
                      y: e.minY + e.height * (1 - cy - ch),
                      width: e.width * cw,
                      height: e.height * ch)
    ci = ci.cropped(to: rect)
    ci = ci.transformed(by: CGAffineTransform(translationX: -rect.minX, y: -rect.minY))
}

// Work at a moderate size so the subject detection is fast.
let pre = 1800.0 / max(ci.extent.width, ci.extent.height)
if pre < 1 { ci = ci.transformed(by: CGAffineTransform(scaleX: pre, y: pre)) }

let ctx = CIContext()
guard let cg = ctx.createCGImage(ci, from: ci.extent) else { print("render failed"); exit(1) }

let handler = VNImageRequestHandler(cgImage: cg, options: [:])
let request = VNGenerateForegroundInstanceMaskRequest()
try handler.perform([request])
guard let result = request.results?.first else { print("no subject found"); exit(1) }
let maskBuffer = try result.generateScaledMaskForImage(forInstances: result.allInstances, from: handler)
let mask = CIImage(cvPixelBuffer: maskBuffer)

let base = CIImage(cgImage: cg)
let gray = base.applyingFilter("CIColorControls", parameters: [kCIInputSaturationKey: 0.0])

let blend = CIFilter.blendWithMask()
blend.inputImage = gray
blend.backgroundImage = CIImage.empty()
blend.maskImage = mask
guard var out = blend.outputImage?.cropped(to: base.extent) else { print("blend failed"); exit(1) }

let s = targetH / out.extent.height
out = out.transformed(by: CGAffineTransform(scaleX: s, y: s))
out = out.transformed(by: CGAffineTransform(translationX: -out.extent.minX, y: -out.extent.minY))

let cs = CGColorSpace(name: CGColorSpace.sRGB)!
try ctx.writePNGRepresentation(of: out, to: outURL, format: .RGBA8, colorSpace: cs)
print("wrote \(outURL.lastPathComponent)  \(Int(out.extent.width))x\(Int(out.extent.height))")
