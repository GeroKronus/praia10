import L from 'leaflet'
import { TipoDenuncia, TIPO_CONFIG } from '@/types'

export function criarIcone(tipo: TipoDenuncia): L.DivIcon {
  const config = TIPO_CONFIG[tipo]
  return L.divIcon({
    html: `<div style="
      background: ${config.cor};
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      border: 2px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    ">${config.emoji}</div>`,
    className: 'custom-marker',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  })
}
