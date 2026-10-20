# Putting eltio.systems live

The try-it app is served at eltio.systems/app, so Try it free never leaves the domain. Repeat steps 2 and 6 for every later update; steps 1, 3, 4 and 5 are done (19 Oct 2026).

Same pattern as lampwerk-site.

1. Create the public repo `elh0/eltio-systems-site`.
2. Build the site from this repo's main branch:

   ```
   git clone --depth 1 https://github.com/elh0/eltio-studio /tmp/es && mkdir -p /tmp/sys
   cp /tmp/es/preview/systems-site-v5/v5.css /tmp/es/preview/systems-site-v5/v5.js /tmp/sys/
   sed -e '/name="robots"/d' -e 's#\.\./systems-app/#app/#g' /tmp/es/preview/systems-site-v5/index.html > /tmp/sys/index.html
   sed -i 's#a\[href\*="systems-app/"\]#a[href^="app/"]#' /tmp/sys/v5.js
   mkdir -p /tmp/sys/app && cp -r /tmp/es/preview/systems-app/. /tmp/sys/app/
   sed -i '/name="robots"/d' /tmp/sys/app/privacy.html /tmp/sys/app/terms.html
   echo eltio.systems > /tmp/sys/CNAME
   ```

   Then push the contents of `/tmp/sys` to main.
3. Turn on GitHub Pages, serving from main at the root, with custom domain `eltio.systems`.
4. In Namecheap, add these records for eltio.systems:
   - A records: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - CNAME: `www` pointing to `elh0.github.io`
5. Enforce HTTPS once the certificate is issued.
6. Check that https://eltio.systems loads on its own and through the www address.
