import math
from PIL import Image, ImageDraw
PAL={'K':(11,14,20),'D':(43,51,64),'M':(74,84,102),'L':(138,147,166),'H':(201,208,220),
 'C':(122,31,31),'c':(74,20,20),'O':(232,220,196),'A':(255,179,71),'B':(226,101,43),
 'Y':(255,241,176),'S':(223,232,234),'s':(150,165,172),'G':(90,58,34)}
meia=["............","..........KK",".........KML","........KDLH","........KDML","........KKKK",
"........KDAK","........KKDM","......KKKCCO",".....KMLHKCO",".....KDMDKOO","......KcKDOB",
"......KcKDOA","......KcKDOO",".....KLHKDDO",".....KKKKMMK","......KccDDK","......KcKDK.",
"......Kc.KDK"[:0]+".....KcKDK..","........KDK.","........KMK.",".......KKDK.",".......KMMK.","............"]
g=[list(r+r[::-1]) for r in meia]
assert len(g)==24 and all(len(r)==24 for r in g), [len(r) for r in g]
g[11][11]='Y'; g[11][12]='Y'; g[12][12]='B'
for x in range(2,7): g[14][x]='K'
g[14][3]='M'; g[14][4]='G'; g[14][5]='M'
for y in range(15,23): g[y][3]='K'; g[y][4]='S'; g[y][5]='K'
g[23][4]='K'
def sprite(chama=0):
    im=Image.new('RGBA',(24,24),(0,0,0,0)); p=im.load()
    for y,r in enumerate(g):
        for x,ch in enumerate(r):
            if ch!='.':
                c=PAL[ch]
                if chama and ch in 'AY': c=(255,255,230) if ch=='Y' else PAL['Y']
                p[x,y]=c+(255,)
    return im
E=16; W,H=32,32
out=Image.new('RGB',(W*E*3+40,H*E+40),(26,31,43))
for i in range(3):
    base=Image.new('RGBA',(W,H)); bd=base.load()
    for y in range(H):
        for x in range(W):
            v=((x//4*7+y//4*13)%5); bd[x,y]=(26+v,31+v,43+v,255)
    if i>=1:
        luz=Image.new('RGBA',(W*8,H*8),(0,0,0,0)); ld=ImageDraw.Draw(luz)
        cx,cy=(4+12)*8,(4+12)*8
        for r in range(110,0,-5):
            a=int(150*(1-r/110)**1.8); ld.ellipse([cx-r,cy-r,cx+r,cy+r],fill=(255,150,60,a))
        base.alpha_composite(luz.resize((W,H),Image.NEAREST))
    base.alpha_composite(sprite(i>=1),(4,4))
    if i==2:
        fx=Image.new('RGBA',(W,H),(0,0,0,0)); fp=fx.load(); cx,cy=17,19
        for ang in range(-70,70,3):
            t=(ang+70)/140
            for rr in range(9,13):
                x=int(round(cx+rr*math.cos(math.radians(ang)))); y=int(round(cy+rr*math.sin(math.radians(ang))))
                if 0<=x<W and 0<=y<H:
                    col=(255,241,176) if rr>=11 else (255,179,71) if rr==10 else (226,101,43)
                    fp[x,y]=col+(int(255*(0.25+0.75*t)),)
        for x,y in [(29,24),(27,27),(30,21),(26,29)]: fp[x,y]=(255,241,176,255)
        base.alpha_composite(fx)
    out.paste(base.convert('RGB').resize((W*E,H*E),Image.NEAREST),(10+i*(W*E+10),20))
out.save('aldric24-referencia.png')
