import L from 'leaflet'
import { TipoDenuncia, TIPO_CONFIG } from '@/types'

export function criarIcone(tipo: TipoDenuncia, confirmacoes: number = 0): L.DivIcon {
  const config = TIPO_CONFIG[tipo]
  const tamanho = confirmacoes >= 3 ? 52 : confirmacoes >= 1 ? 44 : 36
  const fontSize = confirmacoes >= 3 ? 24 : confirmacoes >= 1 ? 21 : 18
  const pulsa = confirmacoes >= 3

  return L.divIcon({
    html: `<div style="
      background: ${config.cor};
      width: ${tamanho}px;
      height: ${tamanho}px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${fontSize}px;
      border: 2px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      position: relative;
    " class="${pulsa ? 'marker-pulse' : ''}">${config.emoji}${confirmacoes > 0 ? `<span style="
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
    ">+${confirmacoes}</span>` : ''}</div>`,
    className: 'custom-marker',
    iconSize: [tamanho, tamanho],
    iconAnchor: [tamanho / 2, tamanho / 2],
    popupAnchor: [0, -tamanho / 2],
  })
}
