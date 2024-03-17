import { BadRequestException, Inject } from '@nestjs/common';
import { AccessCore, Permission } from 'src/cores/access.core';
import { AssetResponseDto, SanitizedAssetResponseDto, mapAsset } from 'src/dtos/asset-response.dto';
import { AuthDto } from 'src/dtos/auth.dto';
import { TimeBucketAssetDto, TimeBucketDto, TimeBucketResponseDto } from 'src/dtos/time-bucket.dto';
import { IAccessRepository } from 'src/interfaces/access.interface';
import { IAssetRepository } from 'src/interfaces/asset.interface';
import { IPartnerRepository } from 'src/interfaces/partner.interface';

export class TimelineService {
  private accessCore: AccessCore;

  constructor(
    @Inject(IAccessRepository) accessRepository: IAccessRepository,
    @Inject(IAssetRepository) private repository: IAssetRepository,
    @Inject(IPartnerRepository) private partnerRepository: IPartnerRepository,
  ) {
    this.accessCore = AccessCore.create(accessRepository);
  }

  async getTimeBuckets(auth: AuthDto, dto: TimeBucketDto): Promise<TimeBucketResponseDto[]> {
    await this.validateDto(auth, dto);
    const userIds = await this.getUserIds(auth, dto);
    await this.checkPermission(auth, dto, userIds);

    return this.repository.getTimeBuckets({ ...dto, userIds });
  }

  async getTimeBucket(
    auth: AuthDto,
    dto: TimeBucketAssetDto,
  ): Promise<AssetResponseDto[] | SanitizedAssetResponseDto[]> {
    await this.validateDto(auth, dto);
    const userIds = await this.getUserIds(auth, dto);
    await this.checkPermission(auth, dto, userIds);
    const assets = await this.repository.getTimeBucket(dto.timeBucket, { ...dto, userIds });
    return !auth.sharedLink || auth.sharedLink?.showExif
      ? assets.map((asset) => mapAsset(asset, { withStack: true, auth }))
      : assets.map((asset) => mapAsset(asset, { stripMetadata: true, auth }));
  }

  private async validateDto(auth: AuthDto, dto: TimeBucketDto) {
    if (dto.albumId) {
      await this.accessCore.requirePermission(auth, Permission.ALBUM_READ, [dto.albumId]);
    }

    if (dto.withPartners) {
      const requestedArchived = dto.isArchived === true || dto.isArchived === undefined;
      const requestedFavorite = dto.isFavorite === true || dto.isFavorite === false;
      const requestedTrash = dto.isTrashed === true;

      if (requestedArchived || requestedFavorite || requestedTrash) {
        throw new BadRequestException(
          'withPartners is only supported for non-archived, non-trashed, non-favorited assets',
        );
      }
    }
  }

  private async getUserIds(auth: AuthDto, dto: TimeBucketDto): Promise<string[]> {
    const userIds = [auth.user.id];

    if (dto.withPartners) {
      const partners = await this.partnerRepository.getAll(auth.user.id);
      const partnersIds = partners
        .filter((partner) => partner.sharedBy && partner.sharedWith && partner.inTimeline)
        .map((partner) => partner.sharedById);

      userIds.push(...partnersIds);
    }

    return userIds;
  }

  private async checkPermission(auth: AuthDto, dto: TimeBucketDto, userIds: string[]) {
    const sharedUsers = userIds.filter((id) => id !== auth.user.id);
    if (sharedUsers.length > 0) {
      await this.accessCore.requirePermission(auth, Permission.TIMELINE_READ, sharedUsers);
      if (dto.isArchived !== false) {
        await this.accessCore.requirePermission(auth, Permission.ARCHIVE_READ, sharedUsers);
      }
    }
  }
}
