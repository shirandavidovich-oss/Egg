/* Inclined-plane core. Fictional contact parameters, physically correct rigid-slide mechanics.
 * World convention: along-slope DOWN positive; theta radians from horizontal.
 * Vanilla JS UMD for browser demo AND Node tests; adapt to existing game's engine as needed.
 */
(function(root,factory){const o=factory(); if(typeof module!=='undefined'&&module.exports)module.exports=o;root.InclinePhysics=o;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const DEG=Math.PI/180;
 function validate(m,theta,muS,muK,g){if(![m,theta,muS,muK,g].every(Number.isFinite)||m<=0||muS<0||muK<0||g<=0||theta<0||theta>Math.PI/2)throw new Error('Invalid inclination physics parameters');}
 function calculate({massKg,angleDeg,muS,muK,g=9.81,velocityDownMps=0}){
   const theta=angleDeg*DEG,m=massKg;validate(m,theta,muS,muK,g);
   const W=m*g,parallel=W*Math.sin(theta),normal=W*Math.cos(theta),staticMax=muS*normal,kineticMagnitude=muK*normal;
   const nearlyStill=Math.abs(velocityDownMps)<1e-7;
   const staticHolds=nearlyStill && parallel<=staticMax+1e-9;
   const friction=staticHolds?parallel:(velocityDownMps< -1e-7?-kineticMagnitude:kineticMagnitude);
   const acceleration=staticHolds?0:(parallel-friction)/m;
   return {weightN:W,parallelN:parallel,perpendicularN:normal,normalN:normal,maxStaticFrictionN:staticMax,actualFrictionN:friction,kineticFrictionN:kineticMagnitude,staticHolds,sliding:!staticHolds,accelerationDownMps2:acceleration,criticalAngleDeg:Math.atan(muS)/DEG,thetaRad:theta};
 }
 function componentsScreen({weightN,thetaRad}){
   // x-right, y-down. Slope rises to right. Parallel points downhill left/down;
   // inward normal points right/down. This sum is gravity (0,+W).
   const p=weightN*Math.sin(thetaRad),q=weightN*Math.cos(thetaRad);
   return {parallel:{x:-p*Math.cos(thetaRad),y:+p*Math.sin(thetaRad)},perpendicular:{x:+q*Math.sin(thetaRad),y:+q*Math.cos(thetaRad)},gravity:{x:0,y:weightN}};
 }
 function step(state,params,dt,trackLengthM=4){
   if(!Number.isFinite(dt)||dt<=0||dt>0.1)throw new Error('dt out of range');
   const pre=calculate({...params,velocityDownMps:state.vDownMps||0});
   let v=state.vDownMps||0;let s=state.sDownM||0;
   if(pre.staticHolds){v=0;}else{
     const proposed=v+pre.accelerationDownMps2*dt;
     v=v>0&&proposed<0?0:Math.max(0,proposed); // demo starts at rest, downhill-only motion
     s+=v*dt;
   }
   const bottom=s>=trackLengthM;
   if(bottom){s=trackLengthM;v=0;}
   return {sDownM:s,vDownMps:v,atBottom:bottom,forces:pre};
 }
 return {calculate,componentsScreen,step,DEG};
});
