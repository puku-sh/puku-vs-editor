import typer
import uvicorn

from copilot_proxy import __version__

cli = typer.Typer(context_settings={"help_option_names": ["-h", "--help"]})


def version_callback(version: bool) -> None:
    if version:
        typer.echo(f"{__version__}")
        raise typer.Exit()


@cli.callback()
def version_option(
    ctx: typer.Context,
    version: bool = typer.Option(
        False, "--version", help="Show version and exit", callback=version_callback
    ),
) -> None:
    pass


@cli.command(name="start")
def start(
    host: str = typer.Option(
        "127.0.0.1",
        "--host",
        help="Host address to bind to",
    ),
    port: int = typer.Option(
        11434,
        "--port",
        "-p",
        help="The port number where the proxy server listens for incoming connections",
    )
) -> None:
    """Start the FastAPI-based Ollama-compatible proxy server"""
    print(f"Starting GLM proxy server on {host}:{port}")
    uvicorn.run("copilot_proxy.app:app", host=host, port=port, reload=False)


def main() -> None:
    cli()


if __name__ == "__main__":
    main()
