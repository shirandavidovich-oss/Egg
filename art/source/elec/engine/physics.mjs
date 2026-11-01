/** Ideal SI calculations for the original electricity game. The scene values specify unit scalings. */
const K=8.9875517923e9, EPS0=8.8541878128e-12, MU0=4*Math.PI*1e-7;
const uC=x=>x*1e-6;
const roundAngle=angle=>Math.abs(angle-90)<1e-9 ? 0 : Math.cos(angle*Math.PI/180);
const safe=Math.abs;
const f=(x)=>Number.isFinite(x)?x:null;
function nearSource(dx,dy){if(dx*dx+dy*dy<1e-7) throw new RangeError('חיישן חופף למטען נקודתי: השדה במודל אינו מוגדר בדיוק במקור. הזז את החיישן.');}
function vectorFrom(q,dx,dy){nearSource(dx,dy);const rsq=dx*dx+dy*dy; const C=K*uC(q)/(rsq*Math.sqrt(rsq)); return [C*dx,C*dy];}
export const constants={K,EPS0,MU0};
export function evaluate(family,p){
 let v={...p};try {
 let r;
 switch(family){
 case 'coulomb':{
  const {q1,q2,r:dist}=v;if(dist<=0) throw new RangeError('המרחק חייב להיות חיובי');
  const signed=K*uC(q1)*uC(q2)/(dist**2);
  r={forceN:safe(signed),interaction:signed>0?'דחייה':signed<0?'משיכה':'אין כוח',energyJ:K*uC(q1)*uC(q2)/dist,signedForce:signed};break;
 }
 case 'forcePair2D':case 'field2D':{
  const xp=family==='field2D'?v.x:v.xProbe, yp=family==='field2D'?v.y:v.yProbe;
  const [f1x,f1y]=vectorFrom(v.q1,xp-v.x1,yp-v.y1),[f2x,f2y]=vectorFrom(v.q2,xp-v.x2,yp-v.y2);
  const Ex=f1x+f2x,Ey=f1y+f2y;
  if(family==='field2D')r={Ex,Ey,E:Math.hypot(Ex,Ey),directionDeg:Math.atan2(Ey,Ex)*180/Math.PI};
  else {let Fx=uC(v.qProbe)*Ex,Fy=uC(v.qProbe)*Ey;r={Fx,Fy,F:Math.hypot(Fx,Fy),Ex,Ey};}
  break;
 }
 case 'plate':{
  if(v.d<=0||v.m<=0)throw new RangeError('המרחק והמסה חייבים להיות חיוביים');
  const E=v.V/v.d,forceN=uC(v.q)*E;r={E,forceN,a:forceN/v.m};break;
 }
 case 'potential':{
  if(v.r<=0)throw new RangeError('המרחק חייב להיות חיובי');
  const potentialV=K*uC(v.qSource)/v.r;r={potentialV,energyJ:uC(v.qTest)*potentialV};break;
 }
 case 'workElectric':{
  const deltaV=v.Vend-v.Vstart,deltaU=uC(v.q)*deltaV;r={deltaV,deltaU,workFieldJ:-deltaU};break;
 }
 case 'capacitor':{
  if(v.dmm<=0||v.kappa<1||v.A<=0)throw new RangeError('פרמטרי קבל לא תקינים');
  const C=EPS0*v.kappa*v.A/(v.dmm*1e-3);r={CuF:C*1e6,QmicroC:C*v.V*1e6,Uj:0.5*C*v.V**2};break;
 }
 case 'capacitorPair':{
  if(v.C1<=0||v.C2<=0)throw new RangeError('קיבולים חיוביים בלבד');
  let Ceq,Q1,Q2,V1,V2;
  if(v.parallel>=0.5){Ceq=v.C1+v.C2;V1=v.V;V2=v.V;Q1=v.C1*v.V;Q2=v.C2*v.V;}
  else {Ceq=v.C1*v.C2/(v.C1+v.C2);Q1=Q2=Ceq*v.V;V1=Q1/v.C1;V2=Q2/v.C2;}
  r={Ceq,Q1,Q2,V1,V2};break;
 }
 case 'capacitorShare':{
  const {C1,C2,V1,V2}=v;if(C1<=0||C2<=0)throw new RangeError('קיבול חייב להיות חיובי');
  const Qtotal=C1*V1+C2*V2,Vfinal=Qtotal/(C1+C2);
  const before=0.5*(C1*V1**2+C2*V2**2)*1e-6,after=0.5*(C1+C2)*Vfinal**2*1e-6;
  r={Vfinal,Qtotal,lostJ:Math.max(0,before-after),energyBeforeJ:before,energyAfterJ:after};break;
 }
 case 'ohm':{
  if(v.R<=0)throw new RangeError('נגד חייב להיות חיובי');const I=v.V/v.R,P=v.V*I;r={I,P,E10s:P*10};break;
 }
 case 'resistivity':{
  const R=(v.rhoNano*1e-9)*v.length/(v.areaMM2*1e-6);if(R<=0)throw new RangeError('חוט עם התנגדות לא חיובית');const I=v.V/R;r={R,I,P:v.V*I};break;
 }
 case 'network':{
  const parallel=v.R2*v.R3/(v.R2+v.R3),Req=v.R1+parallel,Itotal=v.V/Req,Vparallel=Itotal*parallel;
  r={Req,Itotal,Vparallel,I2:Vparallel/v.R2,I3:Vparallel/v.R3};break;
 }
 case 'divider':{
  const I=v.V/(v.Rtop+v.Rbottom);r={I,Vout:I*v.Rbottom,Pbottom:I*I*v.Rbottom};break;
 }
 case 'kirchhoff':{
  const a=v.R1+v.Rshared,b=-v.Rshared,c=-v.Rshared,d=v.R2+v.Rshared;
  const det=a*d-b*c;if(det<=0)throw new RangeError('מערכת לא יציבה');
  const Iloop1=(v.E1*d-b*v.E2)/det,Iloop2=(a*v.E2-c*v.E1)/det,Ishared=Iloop1-Iloop2;
  r={Iloop1,Iloop2,Ishared,Pshared:Ishared**2*v.Rshared,kvl1:(v.R1+v.Rshared)*Iloop1-v.Rshared*Iloop2-v.E1,kvl2:(v.R2+v.Rshared)*Iloop2-v.Rshared*Iloop1-v.E2};break;
 }
 case 'battery':{
  const I=v.E/(v.R+v.r),Vterminal=I*v.R;r={I,Vterminal,Pload:I*Vterminal,Ploss:I*I*v.r};break;
 }
 case 'rcCharge':case 'rcDischarge':{
  if(v.R<=0||v.CmicroF<=0||v.tms<0)throw new RangeError('RC דורש התנגדות, קיבול וזמן חוקיים');
  const tauMs=v.R*v.CmicroF,decay=Math.exp(-v.tms/tauMs);
  if(family==='rcCharge')r={tauMs,Vc:v.E*(1-decay),Ima:v.E/v.R*decay,fraction:1-decay};
  else r={tauMs,Vc:v.V0*decay,Ima:v.V0/v.R*decay,fraction:decay};
  break;
 }
 case 'lorentz':{
  const sin=Math.abs(Math.sin(v.angle*Math.PI/180));
  const forceN=Math.abs(uC(v.q)*v.v*v.B)*sin;
  // Here velocity is +x, Bz signed. Only for v ⟂ B do we express signed Fy.
  r={forceN,signedFy:Math.abs(v.angle-90)<1e-9 ? -uC(v.q)*v.v*v.B : null,workJ:0};break;
 }
 case 'gyroradius':{
  if(v.qMicroC===0||v.B<=0||v.v<=0)throw new RangeError('אין מסלול מעגלי כשמטען/שדה/מהירות מתאימים לאפס');
  const m=v.mNanoKg*1e-9,q=Math.abs(uC(v.qMicroC));
  r={radiusM:m*v.v/(q*v.B),periodSec:2*Math.PI*m/(q*v.B),forceN:q*v.v*v.B};break;
 }
 case 'selector':{
  const netFy=uC(v.q)*(v.E-v.v*v.B);
  r={netFy,vStraight:v.B!==0?v.E/v.B:null,balanced:Math.abs(v.E-v.v*v.B)<1e-7?'כן':'לא'};break;
 }
 case 'wireForce':{
  const amp=v.I*v.L*v.B*Math.sin(v.angle*Math.PI/180);
  r={forceN:Math.abs(amp),signedForce:Math.abs(v.angle-90)<1e-9 ? amp : null};break;
 }
 case 'wireField':{
  if(v.rCm<=0)throw new RangeError('חיישן לא יכול לחפוף לתיל');
  const Btesla=MU0*Math.abs(v.I)/(2*Math.PI*v.rCm*1e-2),signedBz=-MU0*v.I/(2*Math.PI*v.rCm*1e-2);
  r={Btesla,BmicroT:Btesla*1e6,signedBz};break;
 }
 case 'solenoid':{
  if(v.L<=0||v.N<=0)throw new RangeError('אורך וליפופים צריכים להיות חיוביים');
  r={Btesla:MU0*(v.N/v.L)*v.I,turnsPerM:v.N/v.L};break;
 }
 case 'parallelWires':{
  if(v.dCm<=0)throw new RangeError('המרחק צריך להיות חיובי');
  const f=MU0*Math.abs(v.I1*v.I2)*v.L/(2*Math.PI*v.dCm*1e-2);
  r={forceN:f,interaction:v.I1*v.I2>0?'משיכה':v.I1*v.I2<0?'דחייה':'אין כוח'};break;
 }
 case 'faraday':{
  if(v.dt<=0||v.R<=0)throw new RangeError('זמן ונגד צריכים להיות חיוביים');
  const cos=roundAngle(v.angle),fluxDelta=v.A*(v.Bend-v.Bstart)*cos;
  const emf=-v.N*fluxDelta/v.dt,I=emf/v.R;
  r={fluxDelta,emf,I,comment:fluxDelta>0?'מתנגד לעליית השטף החתום':fluxDelta<0?'מתנגד לירידת השטף החתום':'אין שינוי שטף'};break;
 }
 case 'motionalEMF':{
  const emf=v.B*v.L*v.v,I=emf/v.R;
  r={emf,I,P:emf*I,dragN:Math.abs(I*v.B*v.L)};break;
 }
 default:throw new Error('מודל לא מוכר: '+family);
 }
 for(const [key,val] of Object.entries(r)){if(typeof val==='number' && !Number.isFinite(val))throw new Error('תוצאה לא סופית: '+key);}
 return {valid:true,...r};
 }catch(err){return {valid:false,error:err.message};}
}
