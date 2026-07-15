import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";

import { ScheduledJobsService } from "../common/jobs/scheduled-jobs.service";
import { CurationService } from "./curation.service";

const RSS_JOB_INTERVAL_MS = 15 * 60 * 1_000;

@Injectable()
export class CurationScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CurationScheduler.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly jobs: ScheduledJobsService,
    private readonly curationService: CurationService,
  ) {}

  onModuleInit(): void {
    if (
      process.env.NODE_ENV === "test" ||
      process.env.DISABLE_SCHEDULED_JOBS === "true"
    ) {
      return;
    }

    this.timer = setInterval(() => void this.run(), RSS_JOB_INTERVAL_MS);
    this.timer.unref?.();
    void this.run();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async run(): Promise<void> {
    try {
      const execution = await this.jobs.runOncePerBucket(
        "curation:rss-import",
        RSS_JOB_INTERVAL_MS,
        () => this.curationService.importDueFeeds(),
      );

      if (execution.acquired && execution.result.processedFeeds > 0) {
        this.logger.log(
          `RSS import processed ${execution.result.processedFeeds} feed(s), imported ${execution.result.importedResources} resource(s), ${execution.result.failedFeeds} failure(s).`,
        );
      }
    } catch (error) {
      this.logger.error(
        "Scheduled RSS import failed.",
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
