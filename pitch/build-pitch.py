"""Rebuild the seven-slide synthetic Testnet pitch using reportlab."""
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle

ROOT=Path(__file__).resolve().parents[1]
FONT=Path('/System/Library/Fonts/Supplemental')
if (FONT/'Arial.ttf').exists():
    pdfmetrics.registerFont(TTFont('Body',str(FONT/'Arial.ttf')))
    pdfmetrics.registerFont(TTFont('Bold',str(FONT/'Arial Bold.ttf')))
else:
    from reportlab.pdfbase.pdfmetrics import registerFontFamily
    pdfmetrics.registerFontFamily('Helvetica',normal='Helvetica',bold='Helvetica-Bold')
    # Linux users can install Arial-compatible fonts or use these built-ins.
    pdfmetrics.registerFont(pdfmetrics.Font('Body','Helvetica','WinAnsiEncoding'))
    pdfmetrics.registerFont(pdfmetrics.Font('Bold','Helvetica-Bold','WinAnsiEncoding'))
W,H=1280,720
OUT=ROOT/'output/pdf/yerbacapital-pitch.pdf'; OUT.parent.mkdir(parents=True,exist_ok=True)
c=canvas.Canvas(str(OUT),pagesize=(W,H));c.setTitle('YerbaCapital - NEA Tech - prototipo Testnet')
INK='#173D2A';MUTED='#4F6758';PAPER='#F5F3E9';GREEN='#28724B'

def para(text,x,y,width=1100,size=24,color=INK,bold=False):
    style=ParagraphStyle('t',fontName='Bold' if bold else 'Body',fontSize=size,leading=size*1.35,textColor=HexColor(color))
    p=Paragraph(text,style);_,h=p.wrap(width,H);p.drawOn(c,x,H-y-h);return h

def base(n,title,sub=None):
    c.setFillColor(HexColor(PAPER));c.rect(0,0,W,H,fill=1,stroke=0)
    para('yerbacapital',60,32,size=23,bold=True)
    para(title,60,105,size=44,bold=True)
    if sub: para(sub,60,180,size=21,color=MUTED)
    c.setStrokeColor(HexColor('#C8D2C7'));c.line(60,54,1220,54)
    para('NEA Tech 2026 | Prototipo Testnet | Datos sintéticos',60,681,size=12,color=MUTED)
    para(f'{n:02d} / 07',1140,681,size=12,color=MUTED)

def item(label,text,x,y,width=500):
    para(label,x,y,width,size=28,bold=True)
    para(text,x,y+50,width,size=22,color=MUTED)

base(1,'La yerba espera. La próxima zafra necesita capital.','Financiamiento y trazabilidad para yerba canchada en estacionamiento.')
para('6 a 24 meses',60,285,size=64,color=GREEN,bold=True)
para('de estacionamiento natural como referencia sectorial.',60,380,570,size=24)
para('Mientras el inventario madura, continúan salarios, fletes e insumos.',60,455,560,size=26)
item('Misiones + Corrientes','El activo de demo es un lote custodiado. No financiamos hoja verde ni prometemos liquidez real.',740,285,450)
para('Fuente de contexto: AGENTS.md §2 y docs/legal-risk.md (referencias INYM). Los plazos dependen del método.',60,615,size=13,color=MUTED)
c.showPage()
base(2,'Un derecho condicionado sobre un lote verificado.','El token no es la yerba.')
item('Para entidades yerberas','Registrar el lote, reunir evidencia y solicitar un préstamo de prueba con garantía.',60,290)
item('Para prestamistas','Revisar solicitudes e historial y firmar el fondeo en USDC propio de Testnet.',700,290)
para('La blockchain no garantiza existencia, calidad, ubicación ni conservación física.',60,530,1100,size=29,bold=True)
c.showPage()
base(3,'Dos responsabilidades: evidencia física y estado financiero.')
labels=[('Custodio + verificador','Atestación y evidencia'),('registry','Lotes, certificados, gravamen'),('vault + SAC','Préstamo y pagos directos')]
for i,(a,b) in enumerate(labels):
    x=60+i*410
    para(a,x,290,350,size=28,bold=True);para(b,x,350,350,size=22,color=MUTED)
    if i<2: para('→',x+350,300,50,size=34,color=GREEN)
para('Archivos fuera de cadena. SHA-256 registrado en la atestación.',60,470,size=27)
para('IPFS opcional solo con pin confirmado; almacenar no equivale a verificar un hecho físico.',60,530,size=21,color=MUTED)
c.showPage()
base(4,'Por qué Stellar: reglas y registros verificables entre partes.')
item('Soroban','Permisos, gravamen, préstamo y repago se comprueban en contratos.',60,260)
item('SAC / SEP-41','Transferencias directas con un activo propio de prueba, sin pool ni escrow.',700,260)
item('Freighter','Cada actor firma. La selección de rol en la app no otorga permisos.',60,445)
item('Frente a una base centralizada','Las partes pueden contrastar firmas y reglas sin depender solo del servidor.',700,445)
c.showPage()
base(5,'Un prototipo que se puede recorrer.','Portada, panel por rol, mapa ilustrativo e historial público de Testnet.')
asset=ROOT/'pitch/assets/landing.png'
if asset.exists(): c.drawImage(str(asset),60,100,width=720,height=390,preserveAspectRatio=True,anchor='c')
para('Evidencia de ejecución',830,260,380,size=28,bold=True)
para('Contratos y transacciones CLI confirmadas: docs/evidence.md.<br/><br/>La aceptación humana con Freighter sigue pendiente.<br/><br/>El simulador ARS no integra MoneyGram ni liquida pesos.',830,320,360,size=22,color=MUTED)
c.showPage()
base(6,'La confianza también depende del mundo físico.')
item('Existencia y custodia','Segregación, verificador independiente y documentos. Doble prendado externo sigue siendo un riesgo.',60,260)
item('Precio y deterioro','Valuación fechada y reglas de colateral. El contrato aplica la política; no elimina el riesgo económico.',700,260)
item('Incumplimiento','Reclamar el certificado no ejecuta la entrega física: requiere custodio y procedimiento legal.',60,445)
item('Antes de un piloto real','Revisión legal, custodia, seguros, controles y responsabilidades. No hay aprobación regulatoria.',700,445)
c.showPage()
base(7,'Próximo paso: validar el piloto con sus actores.')
para('0,75 %',60,270,size=70,color=GREEN,bold=True)
para('Hipótesis de cargo de originación, sin cobro implementado ni validación comercial.',60,380,530,size=25)
item('Equipo y responsabilidades','Arquitectura, contratos, integración, producto y documentación. Identificación pública de integrantes pendiente de confirmar.',700,260)
item('Qué necesitamos validar','Custodio y entidad participantes, documentación, aceptación con Freighter y operación segura.',700,455)
para('Sin fondos reales, onboarding de inversores ni promesas de rendimiento. Uso de IA declarado en README.',60,615,size=15,color=MUTED)
c.showPage();c.save();print(OUT)
