import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { AggregatedPart } from '../dto/aggregated-part.dto';

@Injectable()
export class ApiService {
  constructor(private http: HttpService, private configService: ConfigService) {
  }

  async fetchSuppliersData() {
    const requests = this.configService.get('suppliers').map(supplier =>
      lastValueFrom(this.http.get(`${supplier['url']}`)),
    );

    const results = await Promise.allSettled(requests);

    const aggregatedPart = new AggregatedPart();

    results.map((result, index) => {
      if (result.status === 'fulfilled') {
        switch (this.configService.get('suppliers')[index]['name']) {
          case 'TTI':
            return processDataFromTTI(result.value.data, aggregatedPart);

          case 'Arrow':
            return processDataFromArrow(result.value.data, aggregatedPart);
        }
      } else {
        console.log('Unable to reach supplier API: ' + this.configService.get('suppliers')[index]['url']);
      }
    });

    return aggregatedPart;
  }
}

function processDataFromTTI(data, aggregatedPart) {
  data['parts'].forEach(part => {
    aggregatedPart.name = part.ttiPartNumber;
    aggregatedPart.description = part.description;
    aggregatedPart.totalStock = (aggregatedPart.totalStock != undefined ? aggregatedPart.totalStock : 0) + part.availableToSell;
    const match = part.leadTime.match(/\d+/);
    const weeks = parseInt(match[0], 10);
    aggregatedPart.manufacturerLeadTime = aggregatedPart.manufacturerLeadTime != undefined ?
      (weeks < aggregatedPart.manufacturerLeadTime ? weeks : aggregatedPart.manufacturerLeadTime) : weeks;
    aggregatedPart.manufacturerName = part.manufacturer;

    const priceBreak = [];
    part.pricing['quantityPriceBreaks'].forEach(p => {
      priceBreak.push({
        'breakQuantity': p.quantity,
        'unitPrice': p.price,
        'totalPrice': p.quantity * p.price,
      })
    });
    const pkg = {
      'type': part.packaging,
      'minimumOrderQuantity': part.salesMinimum,
      'quantityAvailable': part.availableToSell,
      'unitPrice': part.pricing['vipPrice'],
      'supplier': part.manufacturer,
      'priceBreaks': priceBreak,
      'manufacturerLeadTime': part.leadTime,
    }
    if (aggregatedPart.packaging == undefined) {
      aggregatedPart.packaging = [pkg];
    } else if (aggregatedPart.packaging.indexOf(pkg) === -1) {
      aggregatedPart.packaging.push(pkg);
    }
    aggregatedPart.productDoc = part.datasheetURL;
    aggregatedPart.productUrl = part.buyUrl;
    aggregatedPart.productImageUrl = part.imageURL;
    if (aggregatedPart.specifications == undefined) {
      aggregatedPart.specifications = [part.exportInformation];
    } else if (aggregatedPart.specifications.indexOf(part.exportInformation) == -1) {
      aggregatedPart.specifications.push(part.exportInformation);
    }
    if (aggregatedPart.sourceParts == undefined) {
      aggregatedPart.sourceParts = ['TTI']
    } else if (!aggregatedPart.sourceParts.includes('TTI')) {
      aggregatedPart.sourceParts.push('TTI');
    }
  });
}

function processDataFromArrow(data, aggregatedPart) {
  data['pricingResponse'].forEach(part => {
    aggregatedPart.name = part.partNumber;
    aggregatedPart.description = part.description;
    aggregatedPart.totalStock = (aggregatedPart.totalStock != undefined ? aggregatedPart.totalStock : 0) + part.spq;
    const weeks = part.leadTime != undefined ? part.leadTime['supplierLeadTime'] : aggregatedPart.manufacturerLeadTime;
    aggregatedPart.manufacturerLeadTime = aggregatedPart.manufacturerLeadTime != undefined ?
      (weeks < aggregatedPart.manufacturerLeadTime ? weeks : aggregatedPart.manufacturerLeadTime) : weeks;
    aggregatedPart.manufacturerName = part.manufacturer;

    const priceBreak = [];
    if (part.pricingTier != undefined) {
      part.pricingTier.forEach(p => {
        priceBreak.push({
          'breakQuantity': p.minQuantity,
          'unitPrice': p.resalePrice,
          'totalPrice': p.minQuantity * p.resalePrice,
        })
      });
    }
    const pkg = {
      'type': part.pkg,
      'minimumOrderQuantity': part.minOrderQuantity,
      'quantityAvailable': part.fohQuantity,
      'unitPrice': part.spq,
      'supplier': part.supplier,
      'priceBreaks': priceBreak,
      'manufacturerLeadTime': part.leadTime != undefined ? part.leadTime['supplierLeadTime'] : null,
    }
    if (aggregatedPart.packaging == undefined) {
      aggregatedPart.packaging = [pkg];
    } else if (aggregatedPart.packaging.indexOf(pkg) === -1) {
      aggregatedPart.packaging.push(pkg);
    }

    aggregatedPart.productDoc = part.urlData.find(obj => obj.type === 'Datasheet')['value'];
    aggregatedPart.productUrl = part.urlData.find(obj => obj.type === 'Part Details')['value'];
    aggregatedPart.productImageUrl = part.urlData.find(obj => obj.type === 'Image Small')['value'];
    if (aggregatedPart.specifications == undefined) {
      aggregatedPart.specifications = [part.suppPartNum];
    } else if (aggregatedPart.specifications.indexOf(part.suppPartNum) == -1) {
      aggregatedPart.specifications.push(part.suppPartNum);
    }
    if (aggregatedPart.sourceParts == undefined) {
      aggregatedPart.sourceParts = ['Arrow']
    } else if (!aggregatedPart.sourceParts.includes('Arrow')) {
      aggregatedPart.sourceParts.push('Arrow');
    }
  });
}