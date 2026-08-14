from io import BytesIO

from fastapi import FastAPI, File, UploadFile
from fastapi.responses import Response
from PIL import Image
from rembg import new_session, remove

app = FastAPI(title="Used Background Removal", docs_url=None, redoc_url=None)
session = new_session()


def trim_to_visible_content(png_bytes: bytes, padding: int = 2) -> tuple[bytes, tuple[int, int], tuple[int, int]]:
    image = Image.open(BytesIO(png_bytes)).convert("RGBA")
    original_size = image.size

    # Ignore only nearly invisible antialiasing noise, then crop tightly to the
    # remaining foreground. Keep a tiny safety margin so product edges survive.
    alpha = image.getchannel("A")
    visible_mask = alpha.point(lambda value: 255 if value > 4 else 0)
    bbox = visible_mask.getbbox()

    if bbox:
        left, top, right, bottom = bbox
        left = max(0, left - padding)
        top = max(0, top - padding)
        right = min(image.width, right + padding)
        bottom = min(image.height, bottom + padding)
        image = image.crop((left, top, right, bottom))

    output = BytesIO()
    image.save(output, format="PNG", optimize=True)
    return output.getvalue(), original_size, image.size


@app.get("/api")
def health() -> dict[str, str]:
    return {"status": "ok", "mode": "remove-background-and-tight-crop"}


@app.post("/api/remove")
async def remove_and_crop(file: UploadFile = File(...)) -> Response:
    source = await file.read()
    removed = remove(source, session=session)
    result, before, after = trim_to_visible_content(removed, padding=2)

    return Response(
        content=result,
        media_type="image/png",
        headers={
            "X-Transparent-Canvas": f"{before[0]}x{before[1]}",
            "X-Cropped-Canvas": f"{after[0]}x{after[1]}",
        },
    )
