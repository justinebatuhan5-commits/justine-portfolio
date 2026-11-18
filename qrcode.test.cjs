const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const PortfolioQRCode=require('./qrcode.js');

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
 let v=1;
 for(let i=0;i<255;i++){
  GF_EXP[i]=v;GF_LOG[v]=i;v<<=1;if(v&0x100)v^=0x11d;
 }
 for(let i=255;i<512;i++)GF_EXP[i]=GF_EXP[i-255];
})();

function gfMul(a,b){return a===0||b===0?0:GF_EXP[GF_LOG[a]+GF_LOG[b]];}

function evalSyndrome(codewords,ecLen){
 for(let i=0;i<ecLen;i++){
  const alpha=GF_EXP[i];
  let sum=0;
  for(const cw of codewords)sum=gfMul(sum,alpha)^cw;
  if(sum!==0)return false;
 }
 return true;
}

function decodeMatrix(modules){
 const size=modules.length;
 const version=(size-17)/4;
 assert.equal(Number.isInteger(version),true,'Valid QR dimension');
 const spec=VERSION_SPECS[version];
 const [totalCw,ecLen,g1b,g1d,g2b,g2d,remBits,align]=spec;

 // Verify finder patterns
 const verifyFinder=(r0,c0)=>{
  for(let dr=0;dr<7;dr++){
   for(let dc=0;dc<7;dc++){
    const dist=Math.max(Math.abs(dr-3),Math.abs(dc-3));
    assert.equal(modules[r0+dr][c0+dc],dist!==2,`Finder module (${r0+dr},${c0+dc})`);
   }
  }
 };
 verifyFinder(0,0);
 verifyFinder(0,size-7);
 verifyFinder(size-7,0);

 // Verify dark module
 assert.equal(modules[size-8][8],true,'Fixed dark module');

 // Verify timing patterns
 for(let i=8;i<size-8;i++){
  assert.equal(modules[6][i],i%2===0,`Row timing ${i}`);
  assert.equal(modules[i][6],i%2===0,`Col timing ${i}`);
 }

 // Read and verify both format copies
 let fmt1=0;
 for(let i=0;i<=5;i++)fmt1=(fmt1<<1)|(modules[8][i]?1:0);
 fmt1=(fmt1<<1)|(modules[8][7]?1:0);
 fmt1=(fmt1<<1)|(modules[8][8]?1:0);
 fmt1=(fmt1<<1)|(modules[7][8]?1:0);
 for(let i=9;i<15;i++)fmt1=(fmt1<<1)|(modules[14-i][8]?1:0);

 let fmt2=0;
 for(let i=14;i>=8;i--)fmt2=(fmt2<<1)|(modules[size-15+i][8]?1:0);
 for(let i=7;i>=0;i--)fmt2=(fmt2<<1)|(modules[8][size-1-i]?1:0);

 assert.equal(fmt1,fmt2,'Format copies match');
 const unmaskedFmt=fmt1^0x5412;
 const ecBits=(unmaskedFmt>>13)&0b11;
 const maskId=(unmaskedFmt>>10)&0b111;
 assert.equal(ecBits,0,'Error correction level M (00)');
 let bchRem=unmaskedFmt;
 for(let i=14;i>=10;i--)if((bchRem>>i)&1)bchRem^=0x537<<(i-10);
 assert.equal(bchRem,0,'Format BCH syndrome is zero');

 // Verify version info when version >= 7
 const isFunc=Array.from({length:size},()=>new Uint8Array(size));
 const markFinder=(r0,c0)=>{
  for(let dr=-1;dr<=7;dr++)for(let dc=-1;dc<=7;dc++){
   const r=r0+dr,c=c0+dc;
   if(r>=0&&r<size&&c>=0&&c<size)isFunc[r][c]=1;
  }
 };
 markFinder(0,0);markFinder(0,size-7);markFinder(size-7,0);
 for(let i=8;i<size-8;i++){isFunc[6][i]=1;isFunc[i][6]=1;}
 for(let i=0;i<=8;i++){if(i!==6){isFunc[8][i]=1;isFunc[i][8]=1;}}
 for(let i=0;i<8;i++){isFunc[8][size-1-i]=1;isFunc[size-1-i][8]=1;}
 const last=align.length-1;
 for(let i=0;i<=last;i++)for(let j=0;j<=last;j++){
  if((i===0&&j===0)||(i===0&&j===last)||(i===last&&j===0))continue;
  for(let dr=-2;dr<=2;dr++)for(let dc=-2;dc<=2;dc++)isFunc[align[i]+dr][align[j]+dc]=1;
 }
 if(version>=7){
  let v1=0,v2=0;
  for(let i=17;i>=0;i--){
   const a=size-11+(i%3),b=Math.floor(i/3);
   v1=(v1<<1)|(modules[b][a]?1:0);
   v2=(v2<<1)|(modules[a][b]?1:0);
   isFunc[b][a]=1;isFunc[a][b]=1;
  }
  assert.equal(v1,v2,'Version info copies match');
  assert.equal(v1>>12,version,'Decoded version matches');
  let vRem=v1;
  for(let i=17;i>=12;i--)if((vRem>>i)&1)vRem^=0x1f25<<(i-12);
  assert.equal(vRem,0,'Version BCH syndrome is zero');
 }

 const masks=[
  (r,c)=>(r+c)%2===0,
  r=>r%2===0,
  (_r,c)=>c%3===0,
  (r,c)=>(r+c)%3===0,
  (r,c)=>(Math.floor(r/2)+Math.floor(c/3))%2===0,
  (r,c)=>((r*c)%2)+((r*c)%3)===0,
  (r,c)=>(((r*c)%2)+((r*c)%3))%2===0,
  (r,c)=>(((r+c)%2)+((r*c)%3))%2===0
 ];
 const maskFn=masks[maskId];

 // Read zigzag bitstream
 const bits=[];
 let upward=true;
 for(let right=size-1;right>=1;right-=2){
  if(right===6)right=5;
  for(let vert=0;vert<size;vert++){
   const r=upward?size-1-vert:vert;
   for(let step=0;step<2;step++){
    const c=right-step;
    if(!isFunc[r][c]){
     const val=(modules[r][c]?1:0)^(maskFn(r,c)?1:0);
     bits.push(val);
    }
   }
  }
  upward=!upward;
 }
 assert.equal(bits.length,totalCw*8+remBits,'Bit stream length matches capacity');

 // Convert to codewords
 const rawCws=new Uint8Array(totalCw);
 for(let i=0;i<totalCw;i++){
  let b=0;
  for(let j=0;j<8;j++)b=(b<<1)|bits[i*8+j];
  rawCws[i]=b;
 }

 // De-interleave blocks
 const totalBlocks=g1b+g2b;
 const blocks=Array.from({length:totalBlocks},(_,idx)=>new Uint8Array((idx<g1b?g1d:g2d)+ecLen));
 let pos=0;
 const maxData=Math.max(g1d,g2d);
 for(let col=0;col<maxData;col++){
  for(let blk=0;blk<totalBlocks;blk++){
   const dataLen=blk<g1b?g1d:g2d;
   if(col<dataLen)blocks[blk][col]=rawCws[pos++];
  }
 }
 for(let col=0;col<ecLen;col++){
  for(let blk=0;blk<totalBlocks;blk++){
   const dataLen=blk<g1b?g1d:g2d;
   blocks[blk][dataLen+col]=rawCws[pos++];
  }
 }
 assert.equal(pos,totalCw,'All codewords consumed');

 // Check Reed-Solomon syndrome for every block
 const dataBytes=[];
 blocks.forEach((blk,idx)=>{
  assert.equal(evalSyndrome(blk,ecLen),true,`Reed-Solomon syndrome zero for block ${idx}`);
  const dataLen=idx<g1b?g1d:g2d;
  for(let i=0;i<dataLen;i++)dataBytes.push(blk[i]);
 });

 // Decode byte mode payload
 const dataBits=[];
 for(const b of dataBytes)for(let i=7;i>=0;i--)dataBits.push((b>>i)&1);
 const readBits=n=>{
  let v=0;
  for(let i=0;i<n;i++)v=(v<<1)|dataBits.shift();
  return v;
 };
 assert.equal(readBits(4),0b0100,'Byte mode indicator');
 const charCount=readBits(version<10?8:16);
 const payload=new Uint8Array(charCount);
 for(let i=0;i<charCount;i++)payload[i]=readBits(8);
 return new TextDecoder().decode(payload);
}

test('encodes and decodes QR payloads across versions 1, 2, 5, 7+, 10+, and Unicode',()=>{
 const cases=[
  'Hi',
  'https://example.com/app.apk',
  'https://justinebatuhan5-commits.github.io/justine-portfolio/assets/downloads/GovGuide-Ph.apk',
  'https://example.com/downloads/'+'a'.repeat(110)+'.apk',
  'https://example.com/downloads/'+'b'.repeat(210)+'.apk',
  'https://example.com/downloads/'+'c'.repeat(500)+'.apk',
  'https://example.com/apps/GovGuide%20Ph?label=Cebu%20✓'
 ];
 for(const text of cases){
  const qr=PortfolioQRCode.encode(text);
  assert.equal(decodeMatrix(qr.modules),text,`Round-trip failed for ${text}`);
 }
});

test('SVG output reconstructs the exact module matrix with quiet zone',()=>{
 const url='https://justinebatuhan5-commits.github.io/justine-portfolio/assets/downloads/GovGuide-Ph.apk';
 const qr=PortfolioQRCode.encode(url);
 const svg=PortfolioQRCode.toSvgString(url,{margin:4,sizePx:240,label:'GovGuide Ph QR'});
 assert.match(svg,/viewBox="0 0 (\d+) \1"/);
 const pathMatch=svg.match(/<path d="([^"]+)"/);
 assert.ok(pathMatch);
 const margin=4;
 const reconstructed=Array.from({length:qr.size},()=>Array(qr.size).fill(false));
 for(const m of pathMatch[1].matchAll(/M(\d+) (\d+)h(\d+)v1h-\3z/g)){
  const x=Number(m[1])-margin;
  const y=Number(m[2])-margin;
  const len=Number(m[3]);
  for(let i=0;i<len;i++)reconstructed[y][x+i]=true;
 }
 assert.deepEqual(reconstructed,qr.modules);
 assert.equal(decodeMatrix(reconstructed),url);
});

test('rejects empty QR payload',()=>{
 assert.throws(()=>PortfolioQRCode.encode(''));
});

test('portfolio wires GovGuide Ph QR download cleanly without breaking Sound Diary gating',()=>{
 const html=fs.readFileSync('index.html','utf8');
 const js=fs.readFileSync('script.js','utf8');
 assert(html.includes('qrcode.js'));
 assert(html.includes('data-project-id="govguide-ph"'));
 assert(html.includes('href="assets/downloads/GovGuide-Ph.apk"'));
 assert(html.includes('id="qr-dialog"'));
 assert(js.includes("querySelector('.sound-diary-card')"));
 assert(js.includes('PortfolioQRCode.createSvgElement'));
});
