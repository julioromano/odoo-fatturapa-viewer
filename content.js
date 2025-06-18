(function() {
  function extractPKCS7Content(buffer) {
    try {
      const binaryString = forge.util.createBuffer(new Uint8Array(buffer));
      const asn1 = forge.asn1.fromDer(binaryString);
      const signedDataAsn1 = asn1.value[1].value[0];
      console.debug('SignedData ASN.1:', signedDataAsn1);
      const innerContentInfo = signedDataAsn1.value[2];
      console.debug('Inner Content Info:', innerContentInfo);
      const encapsulatedContent = innerContentInfo.value[1].value[0];
      console.debug('Encapsulated Content:', encapsulatedContent);

      let rawBytes = "";
      if (encapsulatedContent.constructed && Array.isArray(encapsulatedContent.value)) {
        encapsulatedContent.value.forEach(part => {
          // Assumes each part is a primitive holding its data in 'value'
          rawBytes += part.value;
        });
      } else {
        rawBytes = encapsulatedContent.value;
      }
      const xmlContent = forge.util.decodeUtf8(rawBytes);
      console.log('Extracted XML Content:\n', xmlContent);
      return xmlContent;
    } catch (ex) {
      console.error('Error processing PKCS#7 envelope:', ex);
    }
  }

  // Function to fetch XML, check for fatturaPa, transform, and display it as HTML.
  function processXML(xmlUrl) {
    console.log("XML fetched:", xmlUrl);
    let fetchPromise;
    let isP7m = false;

    try {
      // Parse the URL to check for a filename query parameter
      const urlObj = new URL(xmlUrl);
      const filename = urlObj.searchParams.get("filename");
      if (filename && filename.endsWith(".p7m")) {
        isP7m = true;
      }
    } catch (err) {
      // Fallback check if URL constructor fails
      if (xmlUrl.indexOf(".p7m") !== -1) {
        isP7m = true;
      }
    }

    if (isP7m) {
      console.log("P7M file detected.");
      fetchPromise = fetch(xmlUrl)
        .then(response => response.arrayBuffer())
        .then(buffer => {
          // Use pki.js to extract the signed XML content
          // This is a hypothetical function from pki.js; adjust accordingly.
          return extractPKCS7Content(buffer);
        });
    } else {
      console.log("XML file detected.");
      fetchPromise = fetch(xmlUrl).then(response => response.text());
    }
  
    fetchPromise.then(xmlString => {
      var parser = new DOMParser();
      var xmlDoc = parser.parseFromString(xmlString, "application/xml");
      
      // Verify that the XML uses the fatturaPa format by checking for <FatturaElettronicaHeader>
      if (xmlDoc.getElementsByTagName("FatturaElettronicaHeader").length === 0) {
        alert("This XML file does not appear to be in the fatturaPa format.");
        return;
      }
      
      // Load the XSLT from the extension resources
      var xsltUrl = chrome.runtime.getURL("transform.xslt");
      return fetch(xsltUrl)
        .then(response => response.text())
        .then(xsltString => {
          var xsltDoc = parser.parseFromString(xsltString, "application/xml");
          var processor = new XSLTProcessor();
          processor.importStylesheet(xsltDoc);
          var resultFragment = processor.transformToFragment(xmlDoc, document);
          
          // Create a temporary container to hold the transformed HTML
          var container = document.createElement("div");
          container.appendChild(resultFragment);
          
          openHtmlInNewWindow(container.innerHTML);
        });
    }).catch(error => {
      console.error("Error processing XML:", error);
    });
  }

  function openHtmlInNewWindow(htmlContent) {
    // You can pass a window name and features string to try and force a new, standalone window.
    const windowFeatures = "toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=768,height=1024";
    const newWin = window.open("", "fatturaPaPreview", windowFeatures);
    if (newWin) {
      newWin.document.open();
      newWin.document.write(`
        <html>
          <head>
            <title>fatturaPa Preview</title>
            <style>
              body { margin: 0; padding: 10px; overflow: auto; font-family: sans-serif; }
            </style>
          </head>
          <body>
            ${htmlContent}
          </body>
        </html>
      `);
      newWin.document.close();
    } else {
      alert("Popup blocked. Please allow popups for this site.");
    }
  }

  function observeAttachmentCards() {
    const observer = new MutationObserver(function(mutations) {
      // Iterate over all attachment cards
      document.querySelectorAll("div.o-mail-AttachmentCard").forEach(card => {
        // If button is missing and this card is an XML attachment, re-add it
        if (!card.querySelector(".render-fatturapa-btn")) {
          // Check for XML or PKCS7 MIME types.
          const xmlIndicator = card.querySelector("[data-mimetype='application/xml'], [data-mimetype='application/pkcs7-mime']");
          const isXml = xmlIndicator || (card.getAttribute("title") || "").toLowerCase().endsWith(".xml") || (card.getAttribute("title") || "").toLowerCase().endsWith(".p7m");
          if (isXml) {
            const renderButton = document.createElement("button");
            renderButton.textContent = "View FatturaPa";
            renderButton.classList.add("render-fatturapa-btn");
            renderButton.style.marginLeft = "5px";
            renderButton.addEventListener("click", function(e) {
              e.preventDefault();
              const downloadBtn = card.querySelector("button[data-download-url]");
              if (downloadBtn) {
                const xmlUrl = downloadBtn.getAttribute("data-download-url");
                console.log("XML URL:", xmlUrl);
                processXML(xmlUrl);
              } else {
                alert("Download URL not found for this attachment.");
              }
            });
            const aside = card.querySelector("div.o-mail-AttachmentCard-aside");
            if (aside) {
              aside.appendChild(renderButton);
            } else {
              card.appendChild(renderButton);
            }
          }
        }
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
  
  function waitForAttachmentCards(callback) {
    const observer = new MutationObserver(function(mutations, obs) {
      const cards = document.querySelectorAll("div.o-mail-AttachmentCard");
      if (cards.length > 0) {
        obs.disconnect();
        callback(cards);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
  
  function init() {
    console.log("Loaded extension");
    waitForAttachmentCards(function(attachmentCards) {
      // Initially add buttons to each attachment card
      attachmentCards.forEach(function(card) {
        console.log("Attachment card found:", card);
        const xmlIndicator = card.querySelector("[data-mimetype='application/xml'], [data-mimetype='application/pkcs7-mime']");
        const isXml = xmlIndicator || (card.getAttribute("title") || "").toLowerCase().endsWith(".xml") || (card.getAttribute("title") || "").toLowerCase().endsWith(".p7m");
  
        if (isXml) {
          if (card.querySelector(".render-fatturapa-btn")) return;
  
          const renderButton = document.createElement("button");
          renderButton.textContent = "View FatturaPa";
          renderButton.classList.add("render-fatturapa-btn");
          renderButton.style.marginLeft = "5px";
          renderButton.addEventListener("click", function(e) {
            e.preventDefault();
            const downloadBtn = card.querySelector("button[data-download-url]");
            if (downloadBtn) {
              const xmlUrl = downloadBtn.getAttribute("data-download-url");
              console.log("XML URL:", xmlUrl);
              processXML(xmlUrl);
            } else {
              alert("Download URL not found for this attachment.");
            }
          });
  
          const aside = card.querySelector("div.o-mail-AttachmentCard-aside");
          if (aside) {
            aside.appendChild(renderButton);
          } else {
            card.appendChild(renderButton);
          }
        }
      });
      // Start observing for changes (e.g. after adaptive layout changes)
      observeAttachmentCards();
    });
  }
  
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
