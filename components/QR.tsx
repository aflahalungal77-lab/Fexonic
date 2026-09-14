'use client';import {useEffect,useState} from 'react';import QRCode from 'qrcode';
export default function QR({value}:{value:string}){const [src,setSrc]=useState('');useEffect(()=>{QRCode.toDataURL(value,{margin:1,width:300,errorCorrectionLevel:'M'}).then(setSrc)},[value]);return src?<img className="tableqr" src={src} alt="Table QR code"/>:<div className="tableqr"/>}
