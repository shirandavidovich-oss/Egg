/** Physics Worlds reference math kernel, SI units. Not a full realtime rigid-body engine.
 * All mathematical models are original code, independently checkable by substitution.
 * For ramp: s positive UP the slope; kinetic friction opposes signed VELOCITY.
 */
export const G = 6.67430e-11;
const rad = d => d*Math.PI/180;
const invalid = (why) => {throw new RangeError('Invalid physics input: '+why);};
const finite = (...v) => {if(v.some(x=>!Number.isFinite(x)))invalid('nonfinite value');};
const positive = (...v) => {finite(...v);if(v.some(x=>x<=0))invalid('nonpositive parameter');};
const nonneg = (...v) => {finite(...v);if(v.some(x=>x<0))invalid('negative parameter');};
const nearZero = x => Math.abs(x)<1e-10;
export function evaluate(kind,p){
 const v=Object.values(p);finite(...v);
 switch(kind){
  case 'units':{
   positive(p.factor);return {baseSI:p.value*p.factor};
  }
  case 'vectors':{
   const Rx=p.ax+p.bx,Ry=p.ay+p.by;
   return {Rx,Ry,magnitude:Math.hypot(Rx,Ry),angle:Math.atan2(Ry,Rx)*180/Math.PI};
  }
  case 'uniform':{
   nonneg(p.t);return {x:p.x0+p.v*p.t,displacement:p.v*p.t,distance:Math.abs(p.v*p.t)};
  }
  case 'meeting':{
   let dv=p.v1-p.v2;
   const t=nearZero(dv)?(nearZero(p.x2-p.x1)?0:null):(p.x2-p.x1)/dv;
   if(t===null||t<0)return {tMeeting:null,xMeeting:null,status:'אין מפגש עתידי במודל'};
   return {tMeeting:t,xMeeting:p.x1+p.v1*t,status:'מפגש'};
  }
  case 'acceleration':{
   nonneg(p.t);
   // Ideal constant acceleration for the selected time, including sign reversal.
   // If you are simulating a BRAKE instead of a force, clamp v=0 at the stop event in the scene model.
   const v=p.v0+p.a*p.t,dx=p.v0*p.t+0.5*p.a*p.t*p.t;
   const tStop=(p.v0*p.a<0)?-p.v0/p.a:null;
   return {v,dx,stoppingTime:tStop};
  }
  case 'vertical':{
   positive(p.g);nonneg(p.h,p.t);const y=p.h+p.v0*p.t-0.5*p.g*p.t*p.t;
   const tPeak=Math.max(0,p.v0/p.g);
   const maxY=p.h+(p.v0>0?p.v0*p.v0/(2*p.g):0);
   const tLand=(p.v0+Math.sqrt(p.v0*p.v0+2*p.g*p.h))/p.g;
   return {y:p.t>tLand?0:Math.max(0,y),v:p.t>tLand?0:p.v0-p.g*p.t,tPeak,maxY,tLand,status:p.t>tLand?'נחת':'באוויר'};
  }
  case 'projectile':{
   positive(p.g);nonneg(p.h,p.t);if(p.v0<0||p.angle<0||p.angle>90)invalid('launch');
   const vx=p.v0*Math.cos(rad(p.angle)),vy=p.v0*Math.sin(rad(p.angle));
   const tLand=(vy+Math.sqrt(vy*vy+2*p.g*p.h))/p.g;
   const t=Math.min(tLand,p.t);
   const y=Math.max(0,p.h+vy*t-0.5*p.g*t*t);
   return {x:vx*t,y,range:vx*tLand,tLand,maxY:p.h+vy*vy/(2*p.g),vx,vy:vy-p.g*t};
  }
  case 'incline':{
   positive(p.m,p.g);nonneg(p.muS,p.muK);if(p.angle<0||p.angle>=90||p.muK>p.muS+1e-10)invalid('incline limits');
   const N=p.m*p.g*Math.cos(rad(p.angle));
   const drive=p.F-p.m*p.g*Math.sin(rad(p.angle));const staticLimit=p.muS*N;
   if(nearZero(p.v0)&&Math.abs(drive)<=staticLimit+1e-10)
    return {N,friction:-drive,a:0,mode:'סטטי',staticLimit,drive};
   const direction=nearZero(p.v0)?Math.sign(drive):Math.sign(p.v0);
   const friction=-direction*p.muK*N;
   return {N,friction,a:(drive+friction)/p.m,mode:'קינטי',staticLimit,drive};
  }
  case 'pulley':{
   positive(p.mA,p.mB,p.g);nonneg(p.muS,p.muK);if(p.angle<0||p.angle>=90||p.muK>p.muS)invalid('pulley');
   // A positive UP incline, B positive DOWN vertical. Rope assumed taut, massless, non-slipping.
   const N=p.mA*p.g*Math.cos(rad(p.angle));
   const drive=p.mB*p.g-p.mA*p.g*Math.sin(rad(p.angle));
   const maxStatic=p.muS*N;
   if(Math.abs(drive)<=maxStatic+1e-9) return {a:0,T:p.mB*p.g,N,mode:'סטטי'};
   const direction=Math.sign(drive);const friction=-direction*p.muK*N;
   const a=(drive+friction)/(p.mA+p.mB);
   const T=p.mB*(p.g-a);
   if(T<0)return {a:null,T:null,N,mode:'חבל רפוי — נדרש מודל אחר'};
   return {a,T,N,mode:'נע'};
  }
  case 'spring':{
   positive(p.k,p.m);return {F:-p.k*p.x,E:0.5*p.k*p.x*p.x,a:-p.k*p.x/p.m};
  }
  case 'energy':{
   positive(p.m,p.g);nonneg(p.h,p.mu,p.d);if(p.v0<0)invalid('starting speed');
   // Downhill Δh feeds a horizontal friction strip d (not the incline itself).
   const initialE=0.5*p.m*p.v0*p.v0+p.m*p.g*p.h;
   const heat=p.mu*p.m*p.g*p.d;
   const remainingE=initialE-heat;
   return {initialE,heat,endV:remainingE>=0?Math.sqrt(2*remainingE/p.m):0,remainingE:Math.max(0,remainingE),status:remainingE<0?'נעצר לפני קצה הרצועה':'עבר את הרצועה',stopDistance:p.mu===0?null:initialE/(p.mu*p.m*p.g)};
  }
  case 'circle':{
   positive(p.m,p.r,p.g);nonneg(p.v,p.mu);
   return {aC:p.v*p.v/p.r,Fc:p.m*p.v*p.v/p.r,period:p.v>0?2*Math.PI*p.r/p.v:null,safeSpeed:Math.sqrt(p.mu*p.g*p.r),status:p.v*p.v/p.r<=p.mu*p.g?'חיכוך מספיק':'החלקה (במודל משטח אופקי)'};
  }
  case 'bank':{
   positive(p.r,p.g);if(p.angle<=0||p.angle>=90)invalid('bank angle');const idealV=Math.sqrt(p.r*p.g*Math.tan(rad(p.angle)));
   return {idealV,idealKmh:3.6*idealV};
  }
  case 'loop':{
   positive(p.m,p.r,p.g);nonneg(p.vTop);const rawN=p.m*(p.vTop*p.vTop/p.r-p.g);return {contact:rawN>=0?'מגע מתקיים':'אין מגע בפסגה',minV:Math.sqrt(p.g*p.r),NTop:Math.max(0,rawN)};
  }
  case 'impulse':{
   positive(p.m,p.dt);const J=p.m*(p.v1-p.v0);return {J,Favg:J/p.dt,deltaP:J};
  }
  case 'collision':{
   positive(p.m1,p.m2);if(p.e<0||p.e>1)invalid('coefficient of restitution');
   const {m1,m2,u1,u2,e}=p;
   const v1=(m1*u1+m2*u2-m2*e*(u1-u2))/(m1+m2);
   const v2=(m1*u1+m2*u2+m1*e*(u1-u2))/(m1+m2);
   const pBefore=m1*u1+m2*u2,pAfter=m1*v1+m2*v2;
   const before=0.5*m1*u1*u1+0.5*m2*u2*u2,after=0.5*m1*v1*v1+0.5*m2*v2*v2;
   return {v1,v2,pBefore,pAfter,lostK:Math.max(0,before-after)};
  }
  case 'recoil':{
   positive(p.m1,p.m2);const v2=-p.m1*p.v1/p.m2;
   return {v2,pTotal:p.m1*p.v1+p.m2*v2};
  }
  case 'gravity':{
   positive(p.M,p.r,p.m);
   const g=G*p.M/(p.r*p.r),vOrbit=Math.sqrt(G*p.M/p.r);
   return {g,F:p.m*g,vOrbit,vEscape:Math.sqrt(2)*vOrbit,period:2*Math.PI*p.r/vOrbit};
  }
  case 'oscillator':{
   positive(p.m,p.k);nonneg(p.A,p.t);const omega=Math.sqrt(p.k/p.m);
   const phi=omega*p.t+p.phase,x=p.A*Math.cos(phi),v=-p.A*omega*Math.sin(phi),a=-omega*omega*x;
   return {period:2*Math.PI/omega,x,v,a,E:0.5*p.k*p.A*p.A};
  }
  case 'capstone':{
   positive(p.m,p.k,p.g,p.d);nonneg(p.mu,p.v0);
   if(p.angle<=0||p.angle>=90)invalid('capstone angle');
   // Friction acts only on incline, spring is at bottom on a frictionless horizontal track.
   const energyAtBottom=0.5*p.m*p.v0*p.v0+p.m*p.g*p.d*(Math.sin(rad(p.angle))-p.mu*Math.cos(rad(p.angle)));
   return {energyAtBottom,endV:energyAtBottom>0?Math.sqrt(2*energyAtBottom/p.m):0,
    compression:energyAtBottom>0?Math.sqrt(2*energyAtBottom/p.k):0,
    status:energyAtBottom<0?'לא מגיע לתחתית (עצירה במדרון)':'מגיע לתחתית'};
  }
  default:throw Error('Unknown model: '+kind);
 }
}
export const modelNames=['units','vectors','uniform','meeting','acceleration','vertical','projectile','incline','pulley','spring','energy','circle','bank','loop','impulse','collision','recoil','gravity','oscillator','capstone'];
