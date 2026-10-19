# Putting eltio.systems live

Same pattern as lampwerk-site.

1. Create the public repo `elh0/eltio-systems-site`.
2. Build the site from this repo's main branch:

   ```
   git clone --depth 1 https://github.com/elh0/eltio-studio /tmp/es && mkdir -p /tmp/sys
   cp /tmp/es/preview/systems-site-v5/v5.css /tmp/es/preview/systems-site-v5/v5.js /tmp/sys/
   sed -e '/name="robots"/d' -e 's#\.\./systems-app/#https://elh0.github.io/eltio-studio/preview/systems-app/#g' /tmp/es/preview/systems-site-v5/index.html > /tmp/sys/index.html
   echo eltio.systems > /tmp/sys/CNAME
   ```

   Then push the contents of `/tmp/sys` to main.
3. Turn on GitHub Pages, serving from main at the root, with custom domain `eltio.systems`.
4. In Namecheap, add these records for eltio.systems:
   - A records: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - CNAME: `www` pointing to `elh0.github.io`
5. Enforce HTTPS once the certificate is issued.
6. Check that https://eltio.systems loads on its own and through the www address.
