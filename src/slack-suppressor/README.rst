================
Slack suppressor
================

Suppress noisy messages on Slack

Deployment
----------

Deploy the app onto a kubernetes cluster::

  > docker build -t localhost/slacksuppresor .
  > docker save -o container.tar localhost/slacksuppresor:latest
  > scp -C .\container.tar master.example.com:~/container.tar
  > ssh master.example.com
  $ microk8s ctr image import container.tar
  $ exit
  > kubectl create secret generic slacksuppressor-secret --from-file=dotenv=.env
  > kubectl apply -f .\deployment.yml
