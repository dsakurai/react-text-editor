FROM debian:stable-slim

ARG USERNAME=vscode
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    locales sudo ca-certificates git \
    rclone \
    && rm -rf /var/lib/apt/lists/* \
    # Set locale, since it is often required by programs 
    && echo "en_US.UTF-8 UTF-8" > /etc/locale.gen && locale-gen \
    && useradd -m -U ${USERNAME} \
    # Password-less sudo
    && echo "${USERNAME} ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/${USERNAME} && chmod 0440 /etc/sudoers.d/${USERNAME}

# RUN apt-get update && apt-get install -y --no-install-recommends \
#     \
#     && rm -rf /var/lib/apt/lists/* \

USER ${USERNAME}

# RUN mkdir -p ~/.config/nix \
# && echo "experimental-features = nix-command flakes" >> ~/.config/nix/nix.conf
