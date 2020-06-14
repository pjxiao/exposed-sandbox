# vim: ft=dockerfile ts=2 sw=2 et
FROM python:3.7-slim-stretch

# see: README.md
ARG APP_BUILD_VERSION="dev"

ARG RUNTIME_DEPS="locales"
ARG CHARSET="UTF-8"
ARG LOCALE="ja_JP.UTF-8"
ARG TZ="Asia/Tokyo"
ARG APPUSER="app"
ARG APPDIR="/opt/app"

RUN mkdir -p ${APPDIR}

# Copy files are requires to install dependencies
COPY requirements.txt ${APPDIR}/
COPY constraints.txt ${APPDIR}/

RUN apt-get update && \
  # Install system dependencies
  apt-get install -y --no-install-recommends \
    ${RUNTIME_DEPS} && \
  # Setting the locale
  echo "${LOCALE} ${CHARSET}" >>/etc/locale.gen && \
  locale-gen && \
  # Setting the timezone
  ln -snf /usr/share/zoneinfo/${TZ} /etc/localtime && \
  echo ${TZ} > /etc/timezone && \
  # Create a non-root user for containers to run as
  useradd -M ${APPUSER} && \
  # Install python packages
  pip install \
    -r ${APPDIR}/requirements.txt \
    -c ${APPDIR}/constraints.txt \
    && \
  # Cleanup
  rm -rf /var/lib/apt/lists/*

# Copy all files
COPY . ${APPDIR}

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONPATH=${APPDIR}
ENV LANG=${LOCALE}
ENV TZ=${TZ}
ENV APP_BUILD_VERSION=${APP_BUILD_VERSION}

WORKDIR ${APPDIR}
USER ${APPUSER}

CMD ["python", "main.py", "suppress"]
