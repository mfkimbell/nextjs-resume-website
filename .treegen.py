
import bpy, math, mathutils
V=mathutils.Vector
def s2l(c): return c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4
def SRGB(r,g,b): return (s2l(r),s2l(g),s2l(b),1.0)

# Sun high overhead, tipped slightly toward the viewer and to one side.
LIGHT = V((0.30,-0.42,0.86)).normalized()
AMBIENT = 0.42          # skylight fill so shadowed sides don't go black
DIFFUSE = 0.72

def shade(col, n):
    """lambert against an overhead sun -> tops bright, undersides dark"""
    l = AMBIENT + DIFFUSE*max(0.0, n.dot(LIGHT))
    return (col[0]*l, col[1]*l, col[2]*l, 1.0)

class Builder:
    def __init__(self): self.tris=[]
    def T(self,a,b,c,col):
        a,b,c=V(a),V(b),V(c)
        n=(b-a).cross(c-a)
        n = n.normalized() if n.length>1e-9 else V((0,0,1))
        self.tris.append((a,b,c,shade(col,n)))
    def catmull(self,pts,n=4):
        out=[]; P=[pts[0]]+list(pts)+[pts[-1],pts[-1]]
        for i in range(len(pts)-1):
            p0,p1,p2,p3=P[i],P[i+1],P[i+2],P[i+3]
            for k in range(n):
                t=k/n; t2=t*t; t3=t2*t
                pos=V([0.5*((2*p1[0][j])+(-p0[0][j]+p2[0][j])*t+
                    (2*p0[0][j]-5*p1[0][j]+4*p2[0][j]-p3[0][j])*t2+
                    (-p0[0][j]+3*p1[0][j]-3*p2[0][j]+p3[0][j])*t3) for j in range(3)])
                out.append((pos,p1[1]+(p2[1]-p1[1])*t))
        out.append((V(pts[-1][0]),pts[-1][1])); return out
    def frame(self,d):
        up=V((0,0,1))
        if abs(d.dot(up))>0.94: up=V((1,0,0))
        x=d.cross(up).normalized(); y=d.cross(x).normalized(); return x,y
    def limb(self,path,seg=9,col=None,smooth=4,jit=0.08,twist=True):
        pts=self.catmull([(V(p),r) for p,r in path],smooth) if smooth else [(V(p),r) for p,r in path]
        rings=[]
        for i,(p,r) in enumerate(pts):
            if i==0: d=(pts[1][0]-p).normalized()
            elif i==len(pts)-1: d=(p-pts[i-1][0]).normalized()
            else: d=(pts[i+1][0]-pts[i-1][0]).normalized()
            x,y=self.frame(d); ring=[]
            for k in range(seg):
                a=2*math.pi*k/seg + (i*0.13 if twist else 0.0)
                rr=r*(1+jit*0.5*math.sin(k*2.3+(i*1.7 if twist else 0))+
                        jit*0.5*math.sin(k*5.1+(i*0.9 if twist else 0)))
                ring.append(p+x*(math.cos(a)*rr)+y*(math.sin(a)*rr))
            rings.append(ring)
        for i in range(len(rings)-1):
            A,B=rings[i],rings[i+1]
            for k in range(seg):
                k2=(k+1)%seg
                self.T(A[k],A[k2],B[k2],col); self.T(A[k],B[k2],B[k],col)
        tc,tr=pts[-1]
        if tr>0.01:
            last=rings[-1]
            for k in range(seg): self.T(last[k],last[(k+1)%seg],tc,col)
    def prism(self,x,y,z0,z1,r,seg,col,jit=0.10):
        """perfectly straight vertical trunk -> tiles seamlessly top-to-bottom"""
        A=[];B=[]
        for k in range(seg):
            a=2*math.pi*k/seg
            rr=r*(1+jit*0.5*math.sin(k*2.3)+jit*0.5*math.sin(k*5.1))
            A.append(V((x+math.cos(a)*rr, y+math.sin(a)*rr, z0)))
            B.append(V((x+math.cos(a)*rr, y+math.sin(a)*rr, z1)))
        for k in range(seg):
            k2=(k+1)%seg
            self.T(A[k],A[k2],B[k2],col); self.T(A[k],B[k2],B[k],col)
    def blob(self,c,r,col,seed=0,sub=1):
        t=(1+math.sqrt(5))/2
        base=[(-1,t,0),(1,t,0),(-1,-t,0),(1,-t,0),(0,-1,t),(0,1,t),(0,-1,-t),(0,1,-t),
              (t,0,-1),(t,0,1),(-t,0,-1),(-t,0,1)]
        F=[(0,11,5),(0,5,1),(0,1,7),(0,7,10),(0,10,11),(1,5,9),(5,11,4),(11,10,2),
           (10,7,6),(7,1,8),(3,9,4),(3,4,2),(3,2,6),(3,6,8),(3,8,9),(4,9,5),
           (2,4,11),(6,2,10),(8,6,7),(9,8,1)]
        Vv=[V(x).normalized() for x in base]
        for _ in range(sub):
            mid={}; nF=[]
            def m(a,b):
                k=(min(a,b),max(a,b))
                if k not in mid:
                    Vv.append(((Vv[a]+Vv[b])/2).normalized()); mid[k]=len(Vv)-1
                return mid[k]
            for a,b,cc in F:
                ab,bc,ca=m(a,b),m(b,cc),m(cc,a)
                nF+=[(a,ab,ca),(b,bc,ab),(cc,ca,bc),(ab,bc,ca)]
            F=nF
        pts=[]
        for i,n in enumerate(Vv):
            j=1+0.17*math.sin(i*2.7+seed*1.9)+0.09*math.sin(i*5.3+seed*0.7)
            pts.append(V(c)+V((n.x*r*j,n.y*r*j,n.z*r*0.95*j)))
        for f in F: self.T(pts[f[0]],pts[f[1]],pts[f[2]],col)
    def to_object(self,name):
        me=bpy.data.meshes.new(name)
        verts=[];faces=[];cols=[]
        for a,b,c,col in self.tris:
            i=len(verts); verts+=[a,b,c]; faces.append((i,i+1,i+2)); cols+=[col]*3
        me.from_pydata([tuple(v) for v in verts],[],faces); me.update()
        for p in me.polygons: p.use_smooth=False
        ca=me.color_attributes.new(name="Col",type='FLOAT_COLOR',domain='POINT')
        for i,c in enumerate(cols): ca.data[i].color=c
        ob=bpy.data.objects.new(name,me); bpy.context.collection.objects.link(ob)
        mat=bpy.data.materials.new(name+"_m"); mat.use_nodes=True
        nt=mat.node_tree
        for n in list(nt.nodes): nt.nodes.remove(n)
        at=nt.nodes.new('ShaderNodeVertexColor'); at.layer_name="Col"
        em=nt.nodes.new('ShaderNodeEmission')          # colours already carry the lighting
        op=nt.nodes.new('ShaderNodeOutputMaterial')
        nt.links.new(at.outputs['Color'],em.inputs['Color'])
        nt.links.new(em.outputs['Emission'],op.inputs['Surface'])
        me.materials.append(mat)
        return ob

BARK  = SRGB(0.50,0.32,0.17)
BARK_L= SRGB(0.58,0.38,0.20)
BARK_D= SRGB(0.39,0.24,0.12)
GREENS=[SRGB(0.22,0.60,0.26),SRGB(0.30,0.72,0.31),SRGB(0.17,0.50,0.21),
        SRGB(0.26,0.66,0.25),SRGB(0.35,0.78,0.35)]
