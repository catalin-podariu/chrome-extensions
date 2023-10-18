(async () => {
  let btn;
  let videoElement;
  let urlPath = window.location.pathname;

  const checkVideoPresence = () => {
    const currentVideoElement = document.querySelector('video');

    if (currentVideoElement && !videoElement) {
      videoElement = currentVideoElement;
      btn = createButton();
      setTimeout(() => {
        document.body.appendChild(btn);
      }, 3000);
      setupVideo(videoElement);
    } else if (!currentVideoElement && videoElement) {
      videoElement = null;
      cleanup();
    }

    if (btn) {
      if (window.location.pathname.includes('/watch')) {
        btn.style.display = 'block';
      } else {
        btn.style.display = 'none';
      }
    }

    if (urlPath !== window.location.pathname) {
      urlPath = window.location.pathname;
      checkVideoPresence();
    }
  };

  const observer = new MutationObserver(checkVideoPresence);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  checkVideoPresence();

  function setupVideo(videoElement) {
    const srcObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.target.tagName === 'VIDEO') {
          btn.classList.add('show');
        }
      });
    });

    srcObserver.observe(videoElement, {
      attributes: true,
      attributeFilter: ['src'],
    });
  }

  function cleanup() {
    if (btn) {
      btn.remove();
      btn = null;
    }
  }

  function isDarkTheme() {
    return document.documentElement.getAttribute('dark') === 'true';
  }

  function getYTThemeColor() {
    return isDarkTheme() ? '#000000' : '#ffffff';
  }

  function createButton() {
    const btn = document.createElement('button');
    btn.id = 'big-text-grabber-btn';
    btn.textContent = 'BTG';
    btn.classList.add('show');
    btn.title = 'Click and draw area to extract text';
    btn.style.backgroundColor = 'transparent';
    btn.style.border = '1px solid';
    btn.style.color = getYTThemeColor();
    btn.style.opacity = '0';
    btn.style.transition = 'opacity 1s';

    if (isDarkTheme()) {
      btn.classList.add('dark-theme');
    } else {
      btn.classList.add('light-theme');
    }

    btn.addEventListener('click', async () => {
      const videoElement = document.querySelector('video');
      if (videoElement) {
        await createCanvasOverlay(videoElement);
      }
    });

    setTimeout(() => {
      btn.style.opacity = '1';
    }, 1000); // fade in
    return btn;
  }
})();

async function getTextFromPausedVideo(rect) {
  const videoElement = document.querySelector('video');
  const canvas = document.createElement('canvas');
  canvas.width = rect.width;
  canvas.height = rect.height;

  const ctx = canvas.getContext('2d');

  const videoComputedStyle = getComputedStyle(videoElement);
  const scaleX = parseFloat(videoComputedStyle.width) / videoElement.videoWidth;
  const scaleY = parseFloat(videoComputedStyle.height) / videoElement.videoHeight;

  ctx.drawImage(
    videoElement,
    rect.x / scaleX, rect.y / scaleY,
    rect.width / scaleX, rect.height / scaleY,
    0, 0, rect.width, rect.height
  );

  try {
    const dataURL = canvas.toDataURL();
    const { data } = await Tesseract.recognize(dataURL, 'eng', {
      logger: (info) => console.log(info),
    });
    return data.text;
  } catch (err) {
    console.error('Error recognizing text:', err);
    return null;
  }
}

function createCanvasOverlay(videoElement) {
  return new Promise((resolve) => {

    const videoRect = videoElement.getBoundingClientRect();
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = videoRect.top + 'px';
    overlay.style.left = videoRect.left + 'px';
    overlay.style.width = videoElement.clientWidth + 'px';
    overlay.style.height = videoElement.clientHeight + 'px';
    overlay.style.zIndex = 1000;
    overlay.style.cursor = 'crosshair';

    let startX, startY;
    const selectionRect = document.createElement('div');
    selectionRect.style.position = 'absolute';
    selectionRect.style.border = '2px dashed #ffcc00';
    selectionRect.style.pointerEvents = 'none';
    selectionRect.style.display = 'none';
    overlay.appendChild(selectionRect);

    overlay.addEventListener('mousedown', (e) => {
      startX = e.clientX - videoRect.left;
      startY = e.clientY - videoRect.top;
      selectionRect.style.left = startX + 'px';
      selectionRect.style.top = startY + 'px';
      selectionRect.style.width = '0';
      selectionRect.style.height = '0';
      selectionRect.style.display = 'block';
    });

    overlay.addEventListener('mousemove', (e) => {
      if (startX === undefined || startY === undefined) return;
      const width = e.clientX - videoRect.left - startX;
      const height = e.clientY - videoRect.top - startY;
      selectionRect.style.width = Math.abs(width) + 'px';
      selectionRect.style.height = Math.abs(height) + 'px';
      selectionRect.style.left = (width < 0) ? (startX + width) + 'px' : startX + 'px';
      selectionRect.style.top = (height < 0) ? (startY + height) + 'px' : startY + 'px';
    });

    overlay.addEventListener('mouseup', async () => {
      const rect = {
        x: parseInt(selectionRect.style.left),
        y: parseInt(selectionRect.style.top),
        width: parseInt(selectionRect.style.width),
        height: parseInt(selectionRect.style.height),
      };
      const text = await getTextFromPausedVideo(rect);
      if (text) {
        overlay.remove();
        navigator.clipboard.writeText(text).then(
          () => {
            console.log('Text copied to clipboard:', text);
            const btn = document.getElementById('big-text-grabber-btn');
            btn.style.backgroundColor = '#009933';
            setTimeout(() => {
              btn.style.backgroundColor = 'transparent';
            }, 2600);
          },
          (err) => {
            console.error('Failed to copy text:', err);
          }
        );
      }
      startX = startY = undefined;
      selectionRect.style.display = 'none';
    });

    document.body.appendChild(overlay);
    resolve(text);
  });
}

// To whom it may concern, you can reach me at catalin.podariu@gmail.com - Enjoy!
