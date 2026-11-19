"""Teste de carga simples (RNF04): consultas públicas concorrentes contra a API.

Uso (API LOCAL rodando e banco populado com `popular_carga`):

    python -m backend.scripts.carga [--url http://localhost:8000] \\
        [--usuarios 10] [--duracao 300]

Mistura lista, filtros e detalhe. Metas do TG1: >= 95% das consultas em até 3 s e
>= 99% de solicitações bem-sucedidas. Recusa hosts não locais (nunca rode contra
Render/Neon de produção).
"""

import argparse
import random
import sys
import threading
import time
from urllib.parse import urlparse

import httpx

HOSTS_LOCAIS = {"localhost", "127.0.0.1", "::1"}
LIMITE_S = 3.0
STATUS = ["Reportado", "Em análise", "Encaminhado", "Em andamento", "Resolvido"]


def host_e_local(url: str) -> bool:
    return urlparse(url).hostname in HOSTS_LOCAIS


def caminhos_possiveis(ids: list[int], categorias: list[int]) -> list[str]:
    """Rotas de leitura exercitadas, com peso maior para a lista."""
    rotas = ["/ocorrencias"] * 3 + ["/categorias"]
    rotas += [f"/ocorrencias?categoria_id={c}" for c in categorias]
    rotas += [f"/ocorrencias?status={s}" for s in STATUS]
    rotas += [f"/ocorrencias/{i}" for i in ids]
    return rotas


def resumir(medidas: list[tuple[float, bool]]) -> dict:
    """Calcula % de respostas <= 3 s e % de sucesso a partir de (duração, ok)."""
    total = len(medidas)
    if total == 0:
        return {"total": 0, "pct_ate_3s": 0.0, "pct_sucesso": 0.0}
    rapidas = sum(1 for d, ok in medidas if ok and d <= LIMITE_S)
    sucesso = sum(1 for _, ok in medidas if ok)
    return {
        "total": total,
        "pct_ate_3s": 100 * rapidas / total,
        "pct_sucesso": 100 * sucesso / total,
    }


def trabalhador(base: str, rotas: list[str], fim: float, medidas: list, trava):
    rng = random.Random()
    with httpx.Client(base_url=base, timeout=30) as cliente:
        while time.monotonic() < fim:
            inicio = time.monotonic()
            try:
                ok = cliente.get(rng.choice(rotas)).status_code == 200
            except httpx.HTTPError:
                ok = False
            duracao = time.monotonic() - inicio
            with trava:
                medidas.append((duracao, ok))


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--url", default="http://localhost:8000")
    ap.add_argument("--usuarios", type=int, default=10)
    ap.add_argument("--duracao", type=int, default=300, help="segundos")
    args = ap.parse_args(argv)

    if not host_e_local(args.url):
        print("Recusado: a URL não é local. Nunca rode carga contra a produção.")
        return 2

    try:
        lista = httpx.get(f"{args.url}/ocorrencias", timeout=60).json()
        categorias = [c["id"] for c in httpx.get(f"{args.url}/categorias").json()]
    except (httpx.HTTPError, ValueError, KeyError, TypeError):
        print("API local indisponível ou resposta inesperada. Ela está rodando?")
        return 1
    ids = [o["id"] for o in lista][:50]
    print(
        f"{len(lista)} ocorrências visíveis; {args.usuarios} usuários por {args.duracao}s"
    )

    medidas: list[tuple[float, bool]] = []
    trava = threading.Lock()
    rotas = caminhos_possiveis(ids, categorias)
    fim = time.monotonic() + args.duracao
    threads = [
        threading.Thread(
            target=trabalhador, args=(args.url, rotas, fim, medidas, trava)
        )
        for _ in range(args.usuarios)
    ]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    r = resumir(medidas)
    print(f"Requisições: {r['total']}")
    print(f"<= 3 s: {r['pct_ate_3s']:.2f}% (meta >= 95%)")
    print(f"Sucesso: {r['pct_sucesso']:.2f}% (meta >= 99%)")
    atingiu = r["pct_ate_3s"] >= 95 and r["pct_sucesso"] >= 99
    print("Metas atingidas." if atingiu else "Metas NÃO atingidas.")
    return 0 if atingiu else 1


if __name__ == "__main__":
    sys.exit(main())
