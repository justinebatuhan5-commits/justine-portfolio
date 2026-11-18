'use strict';
var PortfolioQRCode=(()=>{
 // ISO/IEC 18004 Version 1-20, Error Correction Level M:
 // [totalCodewords, ecPerBlock, g1Blocks, g1Data, g2Blocks, g2Data, remainderBits, alignmentCoords]
 const VERSION_SPECS=[
  null,
  [26,10,1,16,0,0,0,[]],
  [44,16,1,28,0,0,7,[6,18]],
  [70,26,1,44,0,0,7,[6,22]],
  [100,18,2,32,0,0,7,[6,26]],
  [134,24,2,43,0,0,7,[6,30]],
  [172,16,4,27,0,0,7,[6,34]],
  [196,18,4,31,0,0,0,[6,22,38]],
  [242,22,2,38,2,39,0,[6,24,42]],
  [292,22,3,36,2,37,0,[6,26,46]],
  [346,26,4,43,1,44,0,[6,28,50]],
  [404,30,1,50,4,51,0,[6,30,54]],
  [466,22,6,36,2,37,0,[6,32,58]],
  [532,22,8,37,1,38,0,[6,34,62]],
  [581,24,4,40,5,41,3,[6,26,46,66]],
  [655,24,5,41,5,42,3,[6,26,48,70]],
  [733,28,7,45,3,46,3,[6,26,50,74]],
  [815,28,10,46,1,47,3,[6,30,54,78]],
  [901,26,9,43,4,44,3,[6,30,56,82]],
  [991,26,3,44,11,45,3,[6,30,58,86]],
  [1085,26,3,41,13,42,3,[6,34,62,90]]
 ];

 const GF_EXP=new Uint8Array(512);
 const GF_LOG=new Uint8Array(256);
 (()=>{
  let value=1;
  for(let i=0;i<255;i++){
   GF_EXP[i]=value;
   GF_LOG[value]=i;
   value=value<<1;
   if(value&0x100)value^=0x11d;
  }
  for(let i=255;i<512;i++)GF_EXP[i]=GF_EXP[i-255];
 })();

 function gfMul(a,b){
  return a===0||b===0?0:GF_EXP[GF_LOG[a]+GF_LOG[b]];
 }

 function rsGeneratorPoly(degree){
  let poly=new Uint8Array([1]);
  for(let i=0;i<degree;i++){
   const next=new Uint8Array(poly.length+1);
   const root=GF_EXP[i];
   for(let j=0;j<poly.length;j++){
    next[j]^=poly[j];
    next[j+1]^=gfMul(poly[j],root);
   }
   poly=next;
  }
  return poly;
 }

 function rsRemainder(data,ecLength){
  const gen=rsGeneratorPoly(ecLength);
  const rem=new Uint8Array(ecLength);
  for(let i=0;i<data.length;i++){
   const factor=data[i]^rem[0];
   rem.copyWithin(0,1);
   rem[ecLength-1]=0;
   if(factor!==0){
    for(let j=0;j<ecLength;j++)rem[j]^=gfMul(gen[j+1],factor);
   }
  }
  return rem;
 }

 function chooseVersion(byteLength){
  for(let version=1;version<VERSION_SPECS.length;version++){
   const spec=VERSION_SPECS[version];
   const dataCodewords=spec[2]*spec[3]+spec[4]*spec[5];
   const countBits=version<10?8:16;
   const neededBits=4+countBits+byteLength*8;
   if(neededBits<=dataCodewords*8)return version;
  }
  throw new Error('QR payload exceeds supported length.');
 }

 function buildDataCodewords(bytes,version){
  const spec=VERSION_SPECS[version];
  const dataCodewords=spec[2]*spec[3]+spec[4]*spec[5];
  const capacityBits=dataCodewords*8;
  const bits=[];
  const pushBits=(val,len)=>{
   for(let i=len-1;i>=0;i--)bits.push((val>>>i)&1);
  };
  pushBits(0b0100,4);
  pushBits(bytes.length,version<10?8:16);
  for(const b of bytes)pushBits(b,8);
  const terminator=Math.min(4,capacityBits-bits.length);
  for(let i=0;i<terminator;i++)bits.push(0);
  while(bits.length%8!==0)bits.push(0);
  const out=new Uint8Array(dataCodewords);
  for(let i=0;i<bits.length;i+=8){
   let byte=0;
   for(let b=0;b<8;b++)byte=(byte<<1)|bits[i+b];
   out[i>>3]=byte;
  }
  const padBytes=[0xec,0x11];
  for(let idx=bits.length>>3,p=0;idx<dataCodewords;idx++,p^=1){
   out[idx]=padBytes[p];
  }
  return out;
 }

 function buildCodewordStream(bytes,version){
  const spec=VERSION_SPECS[version];
  const [,ecLen,g1Blocks,g1Data,g2Blocks,g2Data,remainderBits]=spec;
  const rawData=buildDataCodewords(bytes,version);
  const blocks=[];
  let offset=0;
  for(let i=0;i<g1Blocks;i++){
   const slice=rawData.subarray(offset,offset+g1Data);
   blocks.push({data:slice,ec:rsRemainder(slice,ecLen)});
   offset+=g1Data;
  }
  for(let i=0;i<g2Blocks;i++){
   const slice=rawData.subarray(offset,offset+g2Data);
   blocks.push({data:slice,ec:rsRemainder(slice,ecLen)});
   offset+=g2Data;
  }
  const bits=[];
  const pushByte=byte=>{
   for(let b=7;b>=0;b--)bits.push((byte>>>b)&1);
  };
  const maxDataLen=Math.max(g1Data,g2Data);
  for(let i=0;i<maxDataLen;i++){
   for(const block of blocks){
    if(i<block.data.length)pushByte(block.data[i]);
   }
  }
  for(let i=0;i<ecLen;i++){
   for(const block of blocks)pushByte(block.ec[i]);
  }
  for(let i=0;i<remainderBits;i++)bits.push(0);
  return bits;
 }

 function createMatrix(size){
  return Array.from({length:size},()=>new Uint8Array(size));
 }

 function setFunctionModule(modules,isFunc,r,c,dark){
  modules[r][c]=dark?1:0;
  isFunc[r][c]=1;
 }

 function drawFinder(modules,isFunc,size,row,col){
  for(let dr=-1;dr<=7;dr++){
   for(let dc=-1;dc<=7;dc++){
    const r=row+dr,c=col+dc;
    if(r<0||r>=size||c<0||c>=size)continue;
    const dist=Math.max(Math.abs(dr-3),Math.abs(dc-3));
    setFunctionModule(modules,isFunc,r,c,dist!==2&&dist!==4);
   }
  }
 }

 function drawAlignment(modules,isFunc,row,col){
  for(let dr=-2;dr<=2;dr++){
   for(let dc=-2;dc<=2;dc++){
    const dist=Math.max(Math.abs(dr),Math.abs(dc));
    setFunctionModule(modules,isFunc,row+dr,col+dc,dist!==1);
   }
  }
 }

 function bchFormatInfo(mask){
  // Error correction level M indicator is 00 in ISO/IEC 18004 Table 12.
  const data=mask&0b111;
  let rem=data<<10;
  for(let i=14;i>=10;i--){
   if((rem>>>i)&1)rem^=0x537<<(i-10);
  }
  return ((data<<10)|rem)^0x5412;
 }

 function bchVersionInfo(version){
  let rem=version<<12;
  for(let i=17;i>=12;i--){
   if((rem>>>i)&1)rem^=0x1f25<<(i-12);
  }
  return (version<<12)|rem;
 }

 function drawFunctionPatterns(version){
  const size=17+4*version;
  const modules=createMatrix(size);
  const isFunc=createMatrix(size);
  drawFinder(modules,isFunc,size,0,0);
  drawFinder(modules,isFunc,size,0,size-7);
  drawFinder(modules,isFunc,size,size-7,0);
  for(let i=8;i<size-8;i++){
   setFunctionModule(modules,isFunc,6,i,i%2===0);
   setFunctionModule(modules,isFunc,i,6,i%2===0);
  }
  const coords=VERSION_SPECS[version][7];
  const last=coords.length-1;
  for(let i=0;i<=last;i++){
   for(let j=0;j<=last;j++){
    if((i===0&&j===0)||(i===0&&j===last)||(i===last&&j===0))continue;
    drawAlignment(modules,isFunc,coords[i],coords[j]);
   }
  }
  // Reserve format info strips and fixed dark module before placing data bits.
  for(let i=0;i<=8;i++){
   if(i!==6){
    setFunctionModule(modules,isFunc,8,i,false);
    setFunctionModule(modules,isFunc,i,8,false);
   }
  }
  for(let i=0;i<8;i++){
   setFunctionModule(modules,isFunc,8,size-1-i,false);
   if(i<7)setFunctionModule(modules,isFunc,size-1-i,8,false);
  }
  setFunctionModule(modules,isFunc,size-8,8,true);
  if(version>=7){
   const verBits=bchVersionInfo(version);
   for(let i=0;i<18;i++){
    const bit=((verBits>>>i)&1)===1;
    const a=size-11+(i%3);
    const b=Math.floor(i/3);
    setFunctionModule(modules,isFunc,b,a,bit);
    setFunctionModule(modules,isFunc,a,b,bit);
   }
  }
  return {size,modules,isFunc};
 }

 function drawFormatInfo(modules,size,mask){
  const bits=bchFormatInfo(mask);
  for(let i=0;i<=5;i++)modules[8][i]=(bits>>>(14-i))&1;
  modules[8][7]=(bits>>>8)&1;
  modules[8][8]=(bits>>>7)&1;
  modules[7][8]=(bits>>>6)&1;
  for(let i=9;i<15;i++)modules[14-i][8]=(bits>>>(14-i))&1;
  for(let i=0;i<8;i++)modules[8][size-1-i]=(bits>>>i)&1;
  for(let i=8;i<15;i++)modules[size-15+i][8]=(bits>>>i)&1;
 }

 function placeDataBits(modules,isFunc,size,bits){
  let bitIdx=0;
  let upward=true;
  for(let right=size-1;right>=1;right-=2){
   if(right===6)right=5;
   for(let vert=0;vert<size;vert++){
    const r=upward?size-1-vert:vert;
    for(let step=0;step<2;step++){
     const c=right-step;
     if(!isFunc[r][c]&&bitIdx<bits.length){
      modules[r][c]=bits[bitIdx++];
     }
    }
   }
   upward=!upward;
  }
 }

 const MASK_FNS=[
  (r,c)=>(r+c)%2===0,
  r=>r%2===0,
  (_r,c)=>c%3===0,
  (r,c)=>(r+c)%3===0,
  (r,c)=>(Math.floor(r/2)+Math.floor(c/3))%2===0,
  (r,c)=>((r*c)%2)+((r*c)%3)===0,
  (r,c)=>(((r*c)%2)+((r*c)%3))%2===0,
  (r,c)=>(((r+c)%2)+((r*c)%3))%2===0
 ];

 function applyMask(modules,isFunc,size,mask){
  const fn=MASK_FNS[mask];
  for(let r=0;r<size;r++){
   for(let c=0;c<size;c++){
    if(!isFunc[r][c]&&fn(r,c))modules[r][c]^=1;
   }
  }
 }

 function countFinderPatternPenalty(line){
  let penalty=0;
  for(let i=0;i<=line.length-11;i++){
   if(line[i]===1&&line[i+1]===0&&line[i+2]===1&&line[i+3]===1&&line[i+4]===1&&line[i+5]===0&&line[i+6]===1&&line[i+7]===0&&line[i+8]===0&&line[i+9]===0&&line[i+10]===0)penalty+=40;
   if(line[i]===0&&line[i+1]===0&&line[i+2]===0&&line[i+3]===0&&line[i+4]===1&&line[i+5]===0&&line[i+6]===1&&line[i+7]===1&&line[i+8]===1&&line[i+9]===0&&line[i+10]===1)penalty+=40;
  }
  return penalty;
 }

 function penaltyScore(modules,size){
  let score=0;
  let darkCount=0;
  const colLine=new Uint8Array(size);
  for(let r=0;r<size;r++){
   let rowRunColor=-1,rowRunLen=0;
   const row=modules[r];
   for(let c=0;c<size;c++){
    const v=row[c];
    darkCount+=v;
    if(v===rowRunColor){
     rowRunLen++;
    }else{
     if(rowRunLen>=5)score+=3+(rowRunLen-5);
     rowRunColor=v;rowRunLen=1;
    }
    if(r<size-1&&c<size-1){
     if(v===row[c+1]&&v===modules[r+1][c]&&v===modules[r+1][c+1])score+=3;
    }
   }
   if(rowRunLen>=5)score+=3+(rowRunLen-5);
   score+=countFinderPatternPenalty(row);
  }
  for(let c=0;c<size;c++){
   let colRunColor=-1,colRunLen=0;
   for(let r=0;r<size;r++){
    const v=modules[r][c];
    colLine[r]=v;
    if(v===colRunColor){
     colRunLen++;
    }else{
     if(colRunLen>=5)score+=3+(colRunLen-5);
     colRunColor=v;colRunLen=1;
    }
   }
   if(colRunLen>=5)score+=3+(colRunLen-5);
   score+=countFinderPatternPenalty(colLine);
  }
  const percent=(darkCount*100)/(size*size);
  const prev5=Math.floor(percent/5)*5;
  const next5=prev5+5;
  score+=Math.min(Math.abs(prev5-50)/5,Math.abs(next5-50)/5)*10;
  return score;
 }

 function encode(text){
  const input=String(text||'');
  if(!input)throw new Error('QR code value must not be empty.');
  const bytes=new TextEncoder().encode(input);
  const version=chooseVersion(bytes.length);
  const bits=buildCodewordStream(bytes,version);
  const {size,modules:base,isFunc}=drawFunctionPatterns(version);
  placeDataBits(base,isFunc,size,bits);
  let bestMask=0,bestScore=Infinity,bestModules=null;
  for(let mask=0;mask<8;mask++){
   const candidate=base.map(row=>new Uint8Array(row));
   applyMask(candidate,isFunc,size,mask);
   drawFormatInfo(candidate,size,mask);
   const score=penaltyScore(candidate,size);
   if(score<bestScore){
    bestScore=score;
    bestMask=mask;
    bestModules=candidate;
   }
  }
  return {
   version,
   mask:bestMask,
   size,
   modules:bestModules.map(row=>Array.from(row,v=>v===1))
  };
 }

 function buildPathData(modules,size,margin){
  const parts=[];
  for(let r=0;r<size;r++){
   let c=0;
   while(c<size){
    if(!modules[r][c]){c++;continue;}
    const start=c;
    while(c<size&&modules[r][c])c++;
    const len=c-start;
    parts.push(`M${start+margin} ${r+margin}h${len}v1h-${len}z`);
   }
  }
  return parts.join('');
 }

 function toSvgString(text,options={}){
  const margin=Number.isInteger(options.margin)&&options.margin>=0?options.margin:4;
  const sizePx=Number.isFinite(options.sizePx)&&options.sizePx>0?options.sizePx:240;
  const fg=options.fg||'#111111';
  const bg=options.bg||'#ffffff';
  const qr=encode(text);
  const viewSize=qr.size+margin*2;
  const d=buildPathData(qr.modules,qr.size,margin);
  const label=String(options.label||'QR code').replace(/["<>&]/g,'');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewSize} ${viewSize}" width="${sizePx}" height="${sizePx}" role="img" aria-label="${label}" shape-rendering="crispEdges"><rect width="${viewSize}" height="${viewSize}" fill="${bg}"/><path d="${d}" fill="${fg}"/></svg>`;
 }

 function createSvgElement(text,options={}){
  const ns='http://www.w3.org/2000/svg';
  const margin=Number.isInteger(options.margin)&&options.margin>=0?options.margin:4;
  const fg=options.fg||'#111111';
  const bg=options.bg||'#ffffff';
  const qr=encode(text);
  const viewSize=qr.size+margin*2;
  const svg=document.createElementNS(ns,'svg');
  svg.setAttribute('viewBox',`0 0 ${viewSize} ${viewSize}`);
  svg.setAttribute('role','img');
  svg.setAttribute('aria-label',options.label||'QR code');
  svg.setAttribute('shape-rendering','crispEdges');
  if(options.sizePx){
   svg.setAttribute('width',String(options.sizePx));
   svg.setAttribute('height',String(options.sizePx));
  }
  const rect=document.createElementNS(ns,'rect');
  rect.setAttribute('width',String(viewSize));
  rect.setAttribute('height',String(viewSize));
  rect.setAttribute('fill',bg);
  const path=document.createElementNS(ns,'path');
  path.setAttribute('d',buildPathData(qr.modules,qr.size,margin));
  path.setAttribute('fill',fg);
  svg.append(rect,path);
  return svg;
 }

 return {encode,toSvgString,createSvgElement};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=PortfolioQRCode;
