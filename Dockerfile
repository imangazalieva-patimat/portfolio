# ============================================================================
# Dockerfile — как Dokploy собирает сайт pati-designer.ru
#
# Берём готовый лёгкий nginx, кладём в него свои настройки (nginx.conf)
# и файлы сайта. В Dokploy у приложения Build Type = Dockerfile,
# путь к файлу — Dockerfile, порт у домена — 80.
#
# Исходник лежит в deploy/ проекта, копия — в корне publish/ (и репозитория).
# ============================================================================

FROM nginx:1.27-alpine

# Свои настройки сервера вместо стандартных: страница 404, сжатие, кэш
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Файлы сайта. Копируется весь репозиторий, поэтому новые страницы
# и картинки попадают на сервер сами, этот файл править не нужно.
COPY . /usr/share/nginx/html

# Служебное из репозитория и стандартные страницы nginx посетителям
# не нужны — удаляем, чтобы они не открывались по прямой ссылке.
RUN rm -rf /usr/share/nginx/html/.git \
           /usr/share/nginx/html/Dockerfile \
           /usr/share/nginx/html/nginx.conf \
           /usr/share/nginx/html/README.md \
           /usr/share/nginx/html/50x.html

EXPOSE 80
