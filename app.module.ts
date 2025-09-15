// src/app/app.module.ts
import { HttpClientModule } from '@angular/common/http';
import { ScheduleRunComponent } from './components/schedule-run/schedule-run.component';

@NgModule({
  declarations: [ScheduleRunComponent],
  imports: [BrowserModule, HttpClientModule],
  bootstrap: [ScheduleRunComponent] // o añádelo a tus rutas/página
})
export class AppModule {}
