import json,pathlib,urllib.request,concurrent.futures
root=pathlib.Path(__file__).resolve().parent.parent
products=json.loads((root/'content/source/products.json').read_text())
out=root/'public/menu';out.mkdir(parents=True,exist_ok=True)
def fetch(p):
 url=p.get('imageUrl')
 if not url:return (p['id'],'no image')
 target=out/(str(p['id'])+'.jpg')
 if target.exists():return (p['id'],'exists')
 try:
  with urllib.request.urlopen('https://watta-sushi-web.onrender.com'+url if url.startswith('/') else url,timeout=40) as response:
   if not response.headers.get('Content-Type','').startswith('image/'):raise ValueError('Not an image')
   target.write_bytes(response.read())
  return (p['id'],'saved')
 except Exception as exc:return (p['id'],str(exc))
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
 for result in executor.map(fetch,products):print(*result,flush=True)
