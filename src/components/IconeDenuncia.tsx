import L from 'leaflet'
import { TipoDenuncia, TIPO_CONFIG } from '@/types'

export function criarIcone(tipo: TipoDenuncia, confirmacoes: number = 0, resolvido: boolean = false): L.DivIcon {
  const config = TIPO_CONFIG[tipo]
  const tamanho = confirmacoes >= 3 ? 52 : confirmacoes >= 1 ? 44 : 36
  const fontSize = confirmacoes >= 3 ? 24 : confirmacoes >= 1 ? 21 : 18
  const pulsa = confirmacoes >= 3

  const badgeResolvido = resolvido ? `<span style="
    position: absolute;
    bottom: -4px;
    right: -4px;
    background: #27ae60;
    color: white;
    font-size: 12px;
    font-weight: bold;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid white;
    line-height: 1;
  ">&#10003;</span>` : ''

  return L.divIcon({
    html: `<div style="
      background: ${resolvido ? '#95a5a6' : config.cor};
      width: ${tamanho}px;
      height: ${tamanho}px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${fontSize}px;
      border: 2px solid ${resolvido ? '#27ae60' : 'white'};
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      position: relative;
      ${resolvido ? 'opacity: 0.75;' : ''}
    " class="${pulsa && !resolvido ? 'marker-pulse' : ''}">${config.emoji}${confirmacoes > 0 && !resolvido ? `<span style="
      position: absolute;
      top: -4px;
      right: -4px;
      background: #3b82f6;
      color: white;
      font-size: 10px;
      font-weight: bold;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1.5px solid white;
    ">+${confirmacoes}</span>` : ''}${badgeResolvido}</div>`,
    className: 'custom-marker',
    iconSize: [tamanho, tamanho],
    iconAnchor: [tamanho / 2, tamanho / 2],
    popupAnchor: [0, -tamanho / 2],
  })
}
