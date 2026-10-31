export function luminance(hex: string) {
  const values = [1,3,5].map(index=>parseInt(hex.slice(index,index+2),16)/255).map(value=>value<=.04045 ? value/12.92 : ((value+.055)/1.055)**2.4)
  return .2126*values[0]+.7152*values[1]+.0722*values[2]
}
export function colorContrast(ink: string, background: string) {
  if(!/^#[0-9a-f]{6}$/i.test(ink) || !/^#[0-9a-f]{6}$/i.test(background))return null
  return (Math.max(luminance(ink),luminance(background))+.05)/(Math.min(luminance(ink),luminance(background))+.05)
}
