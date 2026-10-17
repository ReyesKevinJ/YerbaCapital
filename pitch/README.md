# Materiales para revisión del equipo

- `../output/pdf/yerbacapital-pitch.pdf`: 7 diapositivas; PDF revisado visualmente, menor a 15 MB.
- `video-script.md`: guion para grabar recorrido de app/Freighter en 4:45. Ensayo y grabación humana pendientes.
- `../output/video/pitch-preview-narrado.mp4`: anticipo de las diapositivas, 3:14, 1080p con voz sintética. No es una grabación de aceptación ni muestra firmas nuevas.
- `narration.txt`: texto editable de la voz sintética.

Reproducción opcional del PDF en entorno Python aislado:

```sh
python3 -m venv /tmp/yerba-pitch-tools
/tmp/yerba-pitch-tools/bin/pip install reportlab
/tmp/yerba-pitch-tools/bin/python pitch/build-pitch.py
```

El generador usa Arial local en macOS y Helvetica como fallback. `assets/landing.png`
es una captura del prototipo sin datos personales. El anticipo de video fue compuesto
con las diapositivas y narración de `narration.txt`, voz Paulina de macOS, a 175 palabras
por minuto. Codificación H.264/AAC a 1920x1080; no reemplaza evidencia de firmas.

Antes de publicar: confirmar nombres públicos del equipo, revisar contenido, ensayar,
grabar el flujo real de Freighter y comprobar enlaces públicos en incógnito. No se
incluyen marcas de aprobación, retornos garantizados ni una integración MoneyGram real.
